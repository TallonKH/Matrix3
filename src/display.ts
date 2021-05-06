import { World, CHUNK_SIZE, CHUNK_MODMASK, CHUNK_BITSHIFT, BlockId, Chunk, CHUNK_SIZE2, CHUNK_SIZEm1 } from "./base";
import { NPoint, ZERO } from "./lib/NLib/npoint";

type Rect = [number, number, number, number];

export default class GridDisplay {
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
  private visiblePadding = -1;

  private visibleMin: NPoint | null = null;
  private visibleMax: NPoint | null = null;

  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private resizeFinishTimer: number | undefined = undefined;
  private awaitingResizeEnd = true;
  private resizeHappened = false;

  private redrawLoopRunning = false;
  private redrawRequested = true;
  private redrawPending = false;
  /**
   * rectangular regions pending redraw within chunks (local coords)
   * [-x,-y,+x,+y], inclusive
   */
  private chunkPendingRects: Map<NPoint, Rect> = new Map();
  private static readonly FULL_RECT: Rect = [0, 0, CHUNK_SIZEm1, CHUNK_SIZEm1];

  constructor() {
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

    // // screen follows mouse
    // document.addEventListener("mousemove", (e) => {
    //   this.setViewOrigin(new NPoint(e.offsetX, e.offsetY).addp(this.dims.multiply1(-0.5 * this.pixelsPerBlock)));
    // });

    // // redraw
    // window.setInterval(() => {
    //   if (this.isResizing) {
    //     return;
    //   }
    //   // this.drawDebugChunks();
    //   this.recalcVisibleChunks();
    // }, 100);
  }

  public setViewOrigin(pt: NPoint): NPoint {
    this.viewOrigin = pt;
    this.viewOriginCh = pt.divide1(this.pixelsPerBlock * CHUNK_SIZE);
    this.recalcVisibleChunks();
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
      // console.log(this.visibleMin, this.visibleMax);

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
        // console.log("-----");
        // console.log(`old:${oldMinX},${oldMinY} : ${oldMaxX},${oldMaxY}`);
        // console.log(`new:${newMinX},${newMinY} : ${newMaxX},${newMaxY}`);
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

  private requestChunkRedraw(chunkCoord: NPoint) {
    // console.log(chunkCoord);
    this.chunkPendingRects.set(chunkCoord, GridDisplay.FULL_RECT);
  }

  private cancelChunkRedraw(chunkCoord: NPoint) {
    this.chunkPendingRects.delete(chunkCoord);
  }

  private queueBlockRedraw(chunk: Chunk, i: BlockId) {
    this.redrawRequested = true;
    const x = i & CHUNK_MODMASK;
    const y = i >>> CHUNK_BITSHIFT;
    const chunkCoord = chunk.coord;
    const rect = this.chunkPendingRects.get(chunkCoord);
    if (rect === undefined) {
      this.chunkPendingRects.set(chunkCoord, [x, y, x, y]);
    } else {
      rect[0] = Math.min(x, rect[0]);
      rect[1] = Math.min(y, rect[1]);
      rect[2] = Math.max(x, rect[2]);
      rect[3] = Math.max(y, rect[3]);
    }
  }

  private redrawBlock(chunk: Chunk, i: BlockId) {
    if (this.world === null) {
      throw "Cannot redraw block when world is null!";
      return;
    }
  }

  public startDrawLoop(): void {
    if (this.redrawLoopRunning) {
      return;
    }

    const boundIteration = this.drawLoopIteration.bind(this);
    window.setInterval(() => {
      if (this.redrawRequested && !this.redrawPending) {
        this.redrawRequested = false;
        this.redrawPending = true;
        window.requestAnimationFrame(boundIteration);
      }
    }, ~~(1000 / 30));

    this.redrawLoopRunning = true;
  }

  private drawLoopIteration(): void {
    console.log("loop");
    this.redrawPending = false;
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

    this.world.registerRedrawListener(this.queueBlockRedraw);
    this.recalcVisibleChunks();
  }

  drawDebugChunks(): void {
    if (this.world === null) {
      return;
    }

    const vox = this.viewOrigin.x / this.pixelsPerBlock;
    const voy = this.viewOrigin.y / this.pixelsPerBlock;
    const vodX = vox >>> CHUNK_BITSHIFT;
    const vodY = voy >>> CHUNK_BITSHIFT;

    for (let x = -1; x < this.dims.x >>> CHUNK_BITSHIFT; x++) {
      for (let y = -1; y < this.dims.y >>> CHUNK_BITSHIFT; y++) {
        const vx = ~~(x * CHUNK_SIZE + (vox & CHUNK_MODMASK));
        const vy = ~~(y * CHUNK_SIZE + (voy & CHUNK_MODMASK));

        const cx = x - vodX;
        const cy = y - vodY;

        const exists = this.world.isChunkLoaded(cx, cy);
        this.fillSquare(
          vx, vy,
          CHUNK_SIZE, CHUNK_SIZE,
          exists ? 0 : 1, exists ? 1 : 0, (cx & 1) ^ (cy & 1)
        );

        if (cx === 0 || cy === 0) {
          this.strokeSquare(
            vx + 1, vy + 1,
            CHUNK_SIZE - 2, CHUNK_SIZE - 2,
            1, 1, 1
          );
        }
        this.ctx.textBaseline = "top";
        this.ctx.fillStyle = "black";
        this.ctx.fillText(`${cx}:${cy}`, vx, vy);
        // this.ctx.textBaseline = "top";
        // this.ctx.fillStyle = "red";
        // this.ctx.fillText(`${vx}:${vy}`, vx, vy + 8);
      }
    }
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
}
