import { World, CHUNK_SIZE, CHUNK_MODMASK, CHUNK_BITSHIFT, CHUNK_SIZEm1, CHUNK_SIZE2, UpdateFlags, Chunk } from "./base";
import { NPoint, PointStr, ZERO } from "./lib/NLib/npoint";
// import { GPU } from "gpu.js";

// [minX, minY, maxX, maxY], inclusive
type Rect = [number, number, number, number];

export enum RedrawMode {
  SMART = 0,
  ALWAYS = 1,
  FLAGS = 2,
} export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");

  private ctx: CanvasRenderingContext2D;
  private world: World | null = null;
  private worldDrawListenerId = -1;

  // viewport origin, measured in pixels
  private viewOrigin: NPoint = ZERO;
  // viewport origin, measured in chunk coords
  private viewOriginCh: NPoint = ZERO;

  // viewport dimensions, measured in blocks
  private dims: NPoint = ZERO;
  // viewport dimensions, measured in chunks
  private dimsCh: NPoint = ZERO;

  private pixelsPerBlock = 4;
  private visiblePadding = 0;

  private visibleMin: NPoint | null = null;
  private visibleMax: NPoint | null = null;

  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private resizeFinishTimer: number | undefined = undefined;
  private awaitingResizeEnd = true;
  private resizeHappened = false;

  private redrawLoopRunning = false;
  /**
   * bit determines what requested the redraw; 
   * 1 = resize/load
   * 2 = full chunk
   * 4 = block
   * 8 = view origin change (not necessarily any visible chunk changes)
   */
  private redrawRequested = 1;
  private redrawPending = false;
  /**
   * rectangular regions pending redraw within chunks (local coords)
   * [-x,-y,+x,+y], inclusive
   */
  private chunkPendingRects: Map<PointStr, Rect> = new Map();
  private static readonly FULL_RECT: Rect = [0, 0, CHUNK_SIZEm1, CHUNK_SIZEm1];

  // TODO uncache chunks
  private cachedChunkColorData: Map<PointStr, ImageData> = new Map();

  //TODO make this not-readonly (need to create a new interval)
  private readonly targetFPS;

  constructor(targetFps = 60) {
    this.targetFPS = targetFps;
    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      throw "failed to get canvas context";
      return;
    }
    this.ctx = ctx;
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.background = "none";

    // call resizeCallbacks when resizing has stopped
    (new ResizeObserver((es) => {
      window.clearTimeout(this.resizeFinishTimer);
      this.awaitingResizeEnd = true;
      this.resizeFinishTimer = window.setTimeout(() => {
        this.resizeCallbacks.forEach(c => c(es[0]));
        this.awaitingResizeEnd = false;
        this.resizeHappened = true;
        this.recalcVisibleChunks();
      }, 200);
    })).observe(this.canvas);

    // add a resizeCallback for setting the canvas dimensions to the element dimensions
    this.resizeCallbacks.push(() => {
      const rect = this.canvas.getBoundingClientRect();
      this.dims = new NPoint(rect.width, rect.height).divide1(this.pixelsPerBlock).round();
      this.dimsCh = this.dims.divide1(CHUNK_SIZE);
      this.canvas.width = this.dims.x;
      this.canvas.height = this.dims.y;
      this.recalcVisibleChunks();
    });

    // screen follows mouse
    // document.addEventListener("mousemove", (e) => {
    //   this.setViewOrigin(new NPoint(e.offsetX, e.offsetY).addp(this.dims.multiply1(-0.5 * this.pixelsPerBlock)));
    // });
  }

  public setViewOrigin(pt: NPoint): NPoint {
    this.viewOrigin = pt;
    this.viewOriginCh = pt.divide1(this.pixelsPerBlock * CHUNK_SIZE);
    this.recalcVisibleChunks();
    this.redrawRequested |= 8;
    return pt;
  }

  /**
   * calculuates which chunks are currently visible
   *  - requests the world to keep visible chunks loaded
   *  - requests the world to unload chunks that are no longer visible
   *  - queues a redraw
   */
  public recalcVisibleChunks(): void {
    if (!this.resizeHappened || this.world === null) {
      return;
    }

    const newMinX = Math.floor(-this.viewOriginCh.x) - this.visiblePadding;
    const newMinY = Math.floor(-this.viewOriginCh.y) - this.visiblePadding;
    const newMaxX = Math.floor(this.dimsCh.x - this.viewOriginCh.x) + this.visiblePadding;
    const newMaxY = Math.floor(this.dimsCh.y - this.viewOriginCh.y) + this.visiblePadding;

    // const loadArea: (minX: number, minY: number, maxX: number, maxY: number) => void = (minX, minY, maxX, maxY) => {
    //   world.forArea(minX, minY, maxX, maxY, world.requestChunkLoad.bind(world));
    // };
    // const unloadArea: (minX: number, minY: number, maxX: number, maxY: number) => void = (minX, minY, maxX, maxY) => {
    //   world.forArea(minX, minY, maxX, maxY, world.requestChunkUnload.bind(world));
    // };

    if (this.visibleMin === null || this.visibleMax === null) {
      this.visibleMin = new NPoint(newMinX, newMinY);
      this.visibleMax = new NPoint(newMaxX, newMaxY);

      // nothing loaded yet; load everything in range
      for (let x = newMinX; x <= newMaxX; x++) {
        for (let y = newMinY; y <= newMaxY; y++) {
          this.world.requestChunkLoad(x, y);
          this.requestChunkRedraw(new NPoint(x, y));
        }
      }
    } else {
      // something already loaded; update 
      const oldMinX = this.visibleMin.x;
      const oldMinY = this.visibleMin.y;
      const oldMaxX = this.visibleMax.x;
      const oldMaxY = this.visibleMax.y;

      if (newMinX !== oldMinX || newMaxX !== oldMaxX || newMinY !== oldMinY || newMaxY !== oldMaxY) {
        for (let x = oldMinX; x <= oldMaxX; x++) {
          for (let y = oldMinY; y <= oldMaxY; y++) {
            if (x < newMinX || x > newMaxX || y < newMinY || y > newMaxY) {
              this.world.requestChunkUnload(x, y);
              this.cancelChunkRedraw(new NPoint(x, y));
            }
          }
        }
        for (let x = newMinX; x <= newMaxX; x++) {
          for (let y = newMinY; y <= newMaxY; y++) {
            if (x < oldMinX || x > oldMaxX || y < oldMinY || y > oldMaxY) {
              this.world.requestChunkLoad(x, y);
              this.requestChunkRedraw(new NPoint(x, y));
            }
          }
        }
      }
    }
    this.visibleMin = new NPoint(newMinX, newMinY);
    this.visibleMax = new NPoint(newMaxX, newMaxY);
  }

  public requestChunkRedraw(chunkCoord: NPoint): void {
    this.redrawRequested |= 2;
    this.chunkPendingRects.set(chunkCoord.toHash(), GridDisplay.FULL_RECT);
  }

  private cancelChunkRedraw(chunkCoord: NPoint) {
    this.chunkPendingRects.delete(chunkCoord.toHash());
  }

  /**
   * in reality, this function just queues a chunk redraw
   * (and more important, updates the dirty rect within that chunk)
   */
  private queueBlockRedraw(chunk: Chunk, i: number) {
    this.redrawRequested |= 4;
    const x = i & CHUNK_MODMASK;
    const y = i >> CHUNK_BITSHIFT;

    const chunkCoord = chunk.coord;

    const hash = chunkCoord.toHash();
    const rect = this.chunkPendingRects.get(hash);
    if (rect === undefined) {
      this.chunkPendingRects.set(hash, [x, y, x, y]);
    } else {
      rect[0] = Math.min(x, rect[0]);
      rect[1] = Math.min(y, rect[1]);
      rect[2] = Math.max(x, rect[2]);
      rect[3] = Math.max(y, rect[3]);
    }
  }

  public startDrawLoop(): void {
    if (this.redrawLoopRunning) {
      return;
    }

    const boundIteration = this.drawLoopIteration.bind(this);
    window.setInterval(() => {
      if (this.redrawRequested > 0 && !this.redrawPending && this.resizeHappened) {
        this.redrawRequested = 0;
        this.redrawPending = true;
        window.requestAnimationFrame(boundIteration);
      }
    }, ~~(1000 / this.targetFPS));

    this.redrawLoopRunning = true;
  }

  private drawLoopIteration(): void {
    for (const coordRectPair of this.chunkPendingRects) {
      this.redrawChunkRect(coordRectPair[0], coordRectPair[1]);
    }

    this.renderView();
    this.redrawPending = false;
    this.chunkPendingRects.clear();
  }

  private renderView() {
    if (this.visibleMin === null || this.visibleMax === null) {
      throw "can't render view when visiblemin/max are null!";
    }
    this.ctx.clearRect(0, 0, this.dims.x, this.dims.y);

    for (let x = this.visibleMin.x; x <= this.visibleMax.x; x++) {
      for (let y = this.visibleMin.y; y <= this.visibleMax.y; y++) {
        const chunkColorData = this.cachedChunkColorData.get(NPoint.toHash(x, y));
        if (chunkColorData !== undefined) {
          this.ctx.putImageData(chunkColorData,
            Math.floor(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
            Math.floor(y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock));
        }
      }
    }
  }

  private redrawChunkDebug(chunkHash: string, mode: RedrawMode): ImageData {
    if (this.world === null) {
      throw "can't debug redraw chunk rect when world is null!";
    }

    const colors = new ImageData(CHUNK_SIZE, CHUNK_SIZE);
    const chunk = this.world.getChunkByHash(chunkHash);
    if (chunk === undefined) {
      for (let i = 0; i < CHUNK_SIZE2; i++) {
        colors.data[i << 2] = 255;
      }
      return colors;
    }

    for (let i = 0; i < CHUNK_SIZE2; i++) {
      const colIndex = i << 2;

      switch (mode) {
        case RedrawMode.ALWAYS: {
          const blockType = this.world.getBlockType(chunk.getTypeOfBlock(i));
          const color = blockType.shader(this.world, chunk, i, i & CHUNK_MODMASK, i >> CHUNK_BITSHIFT);

          colors.data[colIndex + 0] = ~~(color.r * 255);
          colors.data[colIndex + 1] = ~~(color.g * 255);
          colors.data[colIndex + 2] = ~~(color.b * 255);
          colors.data[colIndex + 3] = 255;
          break;
        }
        case RedrawMode.FLAGS: {
          colors.data[colIndex + 0] = chunk.getFlagOfBlock(i, UpdateFlags.PENDING_TICK) ? 100 : 0;
          colors.data[colIndex + 1] = chunk.getFlagOfBlock(i, UpdateFlags.PENDING_REDRAW) ? 100 : 0;
          colors.data[colIndex + 2] = chunk.getFlagOfBlock(i, UpdateFlags.LOCKED) ? 100 : 0;
          colors.data[colIndex + 3] = 255;
          break;
        }
      }
    }
    return colors;
  }

  private redrawChunkRect(chunkHash: string, rect: Rect) {
    if (this.world === null) {
      throw "can't redraw chunk rect when world is null!";
    }

    const colors = this.cachedChunkColorData.get(chunkHash) ?? new ImageData(CHUNK_SIZE, CHUNK_SIZE);
    this.cachedChunkColorData.set(chunkHash, colors);

    const xi = rect[0];
    const yi = rect[1];
    const w = rect[2] - rect[0];
    const h = rect[3] - rect[1];
    const chunk = this.world.getChunkByHash(chunkHash);
    // sometimes a chunk will be unloaded before the draw has finished, so it will be undefined here.
    // that's not a big deal; just ignore it and continue
    if (chunk === undefined) {
      return;
    }
    // use <= because rects are inclusive
    for (let x = 0; x <= w; x++) {
      for (let y = 0; y <= h; y++) {
        const blockIndex = (x + xi) + ((y + yi) << CHUNK_BITSHIFT);
        const blockType = this.world.getBlockType(chunk.getTypeOfBlock(blockIndex));
        const color = blockType.shader(this.world, chunk, blockIndex, x, y);

        const colIndex = blockIndex << 2;
        colors.data[colIndex + 0] = ~~(color.r * 255);
        colors.data[colIndex + 1] = ~~(color.g * 255);
        colors.data[colIndex + 2] = ~~(color.b * 255);
        colors.data[colIndex + 3] = 255;
      }
    }
  }

  public unlink(): void {
    if (this.world === null) {
      return;
    }
    this.world.unregisterRedrawListener(this.worldDrawListenerId);
    this.world = null;
  }

  public link(world: World): void {
    this.unlink();
    this.world = world;

    this.world.registerRedrawListener(this.queueBlockRedraw.bind(this));
    this.recalcVisibleChunks();
  }

  public fillSquare(x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
    const len = (w * h) << 2;
    const data = new Uint8ClampedArray(len);
    r = ~~(r * 255);
    g = ~~(g * 255);
    b = ~~(b * 255);
    for (let i = 0; i < len; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
    this.ctx.putImageData(new ImageData(data, w, h), x, y);
  }

  public strokeSquare(x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
    const data = this.ctx.getImageData(x, y, w, h).data;
    r = ~~(r * 255);
    g = ~~(g * 255);
    b = ~~(b * 255);
    const hOffset = (h - 1) * w * 4;
    for (let x = 0; x < w * 4; x += 4) {
      data[x] = r;
      data[x + 1] = g;
      data[x + 2] = b;
      data[x + 3] = 255;
      data[x + hOffset] = r;
      data[x + hOffset + 1] = g;
      data[x + hOffset + 2] = b;
      data[x + hOffset + 3] = 255;
    }
    const wOffset = (w - 1) * 4;
    for (let y = 0; y < h * w * 4; y += w * 4) {
      data[y] = r;
      data[y + 1] = g;
      data[y + 2] = b;
      data[y + 3] = 255;
      data[y + wOffset] = r;
      data[y + wOffset + 1] = g;
      data[y + wOffset + 2] = b;
      data[y + wOffset + 3] = 255;
    }
    this.ctx.putImageData(new ImageData(data, w, h), x, y);
  }

  public setViewDims(viewDims: NPoint): void {
    this.dims = viewDims;
    this.canvas.width = viewDims.x;
    this.canvas.height = viewDims.y;
  }

  public getViewDims(): NPoint {
    return this.dims;
  }

  public renderViewDebug(mode: RedrawMode): void {
    if (this.visibleMin === null || this.visibleMax === null) {
      throw "can't debug render view when visiblemin/max are null!";
    }
    this.ctx.clearRect(0, 0, this.dims.x, this.dims.y);

    for (let x = this.visibleMin.x; x <= this.visibleMax.x; x++) {
      for (let y = this.visibleMin.y; y <= this.visibleMax.y; y++) {
        const chunkColorData = this.redrawChunkDebug(NPoint.toHash(x, y), mode);
        if (chunkColorData !== undefined) {
          this.ctx.putImageData(chunkColorData,
            Math.floor(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
            Math.floor(y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock));
        }
      }
    }
  }
}

