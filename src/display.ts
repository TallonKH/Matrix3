import { World, CHUNK_SIZE, CHUNK_MODMASK, CHUNK_BITSHIFT, CHUNK_SIZEm1, CHUNK_SIZE2, UpdateFlags, Chunk } from "./base";
import { NPoint, PointStr, ZERO } from "./lib/NLib/npoint";
import { Kernel } from "gpu.js";
import getShaderKernel from "./display-shader";
import { Color } from "./library";

// [minX, minY, maxX, maxY], inclusive
type Rect = [number, number, number, number];

export type BlockShaderFactorMap = {
  min: Color,
  max: Color,
  randFactor?: number,
  noise1Factor?: number, noise1ScaleX?: number, noise1ScaleY?: number, noise1ScaleTime?: number,
  noise2Factor?: number, noise2ScaleX?: number, noise2ScaleY?: number, noise2ScaleTime?: number,
  timeFactor?: number, timeScale?: number, timeOffsetFactor?: number,
}

export type BlockShaderFactorList = [
  number, number, number,
  number, number, number,
  number,
  number, number, number, number,
  number, number, number, number,
  number, number, number
];

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

  private pixelsPerBlock = 6;
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
  private chunkPendingRects: Map<PointStr, [NPoint, Rect]> = new Map();
  private static readonly FULL_RECT: Rect = [0, 0, CHUNK_SIZEm1, CHUNK_SIZEm1];

  // coord hash : chunk coord, data
  // private cachedChunkColorData: Map<PointStr, [NPoint, ImageData]> = new Map();

  //TODO make this not-readonly (need to create a new interval)
  private readonly targetFPS;
  private cacheBuffer = 0;

  private blockShaders: Array<BlockShaderFactorList> = [];
  private shaderKernel;

  constructor(targetFps = 30) {
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

    this.shaderKernel = getShaderKernel().setOutput([CHUNK_SIZE, CHUNK_SIZE]);
    // screen follows mouse
    // document.addEventListener("mousemove", (e) => {
    //   this.setViewOrigin(new NPoint(e.offsetX, e.offsetY).addp(this.dims.multiply1(-0.5 * this.pixelsPerBlock)));
    // });
  }

  public setViewOrigin(pt: NPoint): void {
    this.viewOrigin = pt;
    this.viewOriginCh = pt.divide1(this.pixelsPerBlock * CHUNK_SIZE);
    this.recalcVisibleChunks();
    this.redrawRequested |= 8;
  }

  public getViewOrigin(): NPoint {
    return this.viewOrigin;
  }

  public registerBlockShader(blockName: string, args: BlockShaderFactorMap): BlockShaderFactorList | null {
    if (this.world === null || !this.world.isInitialized()) {
      throw "cannot register a block shader before world is linked/initialized!";
    }
    const id = this.world.getBlockTypeIndex(blockName);
    if (id === undefined) {
      console.warn(`failed to register shader for unknown block '${blockName}'`);
      return null;
    }

    const argList: BlockShaderFactorList = [
      args.min.r, args.min.g, args.min.b,
      args.max.r, args.max.g, args.max.b,
      args.randFactor ?? 1,
      args.noise1Factor ?? 0, args.noise1ScaleX ?? 0.1, args.noise1ScaleY ?? 0.1, args.noise1ScaleTime ?? 0,
      args.noise2Factor ?? 0, args.noise2ScaleX ?? 0.1, args.noise2ScaleY ?? 0.1, args.noise2ScaleTime ?? 0,
      args.timeFactor ?? 0, args.timeScale ?? 1, args.timeOffsetFactor ?? 0
    ];
    this.blockShaders[id] = argList;
    return argList;
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
          // this.requestChunkRedraw(new NPoint(x, y));
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
              // this.cancelChunkRedraw(new NPoint(x, y));
            }
          }
        }
        for (let x = newMinX; x <= newMaxX; x++) {
          for (let y = newMinY; y <= newMaxY; y++) {
            if (x < oldMinX || x > oldMaxX || y < oldMinY || y > oldMaxY) {
              this.world.requestChunkLoad(x, y);
              // this.requestChunkRedraw(new NPoint(x, y));
            }
          }
        }
      }
    }
    this.visibleMin = new NPoint(newMinX, newMinY);
    this.visibleMax = new NPoint(newMaxX, newMaxY);
  }

  // public requestChunkRedraw(chunkCoord: NPoint): void {
  //   this.redrawRequested |= 2;
  //   this.chunkPendingRects.set(chunkCoord.toHash(), [chunkCoord, GridDisplay.FULL_RECT]);
  // }

  // private cancelChunkRedraw(chunkCoord: NPoint) {
  //   this.chunkPendingRects.delete(chunkCoord.toHash());
  // }

  // /**
  //  * in reality, this function just queues a chunk redraw
  //  * (and more important, updates the dirty rect within that chunk)
  //  */
  // private queueBlockRedraw(chunk: Chunk, i: number) {
  //   this.redrawRequested |= 4;
  //   const x = i & CHUNK_MODMASK;
  //   const y = i >> CHUNK_BITSHIFT;

  //   const chunkCoord = chunk.coord;

  //   const hash = chunkCoord.toHash();
  //   const prect = this.chunkPendingRects.get(hash);
  //   if (prect === undefined) {
  //     this.chunkPendingRects.set(hash, [chunkCoord, [x, y, x, y]]);
  //   } else {
  //     const rect = prect[1];
  //     rect[0] = Math.min(x, rect[0]);
  //     rect[1] = Math.min(y, rect[1]);
  //     rect[2] = Math.max(x, rect[2]);
  //     rect[3] = Math.max(y, rect[3]);
  //   }
  // }

  public startDrawLoop(): void {
    if (this.redrawLoopRunning) {
      return;
    }

    const boundIteration = this.drawLoopIteration.bind(this);
    window.setInterval(() => {
      // if (this.redrawRequested > 0 && !this.redrawPending && this.resizeHappened) {
      //   this.redrawRequested = 0;
      //   this.redrawPending = true;
      //   window.requestAnimationFrame(boundIteration);
      // }
      if (!this.redrawPending && this.resizeHappened) {
        this.redrawPending = true;
        window.requestAnimationFrame(boundIteration);
      }
    }, ~~(1000 / this.targetFPS));

    this.redrawLoopRunning = true;
  }

  private drawLoopIteration(): void {
    if (this.visibleMin === null || this.visibleMax === null) {
      throw "tried draw loop iteration with null min/max";
      return;
    }

    // // uncache chunks that aren't in view anymore
    // const chunksToUncache: Array<string> = [];
    // for (const coordRectPair of this.cachedChunkColorData) {
    //   const coord = coordRectPair[1][0];
    //   if (coord.x < (this.visibleMin.x - this.cacheBuffer)
    //     || coord.y < (this.visibleMin.y - this.cacheBuffer)
    //     || coord.x > (this.visibleMax.x + this.cacheBuffer)
    //     || coord.y > (this.visibleMax.y + this.cacheBuffer)) {
    //     chunksToUncache.push(coordRectPair[0]);
    //   }
    // }
    // for (const coord of chunksToUncache) {
    //   this.cachedChunkColorData.delete(coord);
    // }

    if (this.world === null) {
      throw "can't draw if world is null!";
    }

    for (let x = this.visibleMin.x; x <= this.visibleMax.x; x++) {
      for (let y = this.visibleMin.y; y <= this.visibleMax.y; y++) {
        const chunk = this.world.getChunk(x, y);
        if (chunk === undefined) {
          continue;
        }
        this.redrawChunkGPU(this.world, chunk);
      }
    }

    // for (const coordRectPair of this.chunkPendingRects) {
    //   this.redrawChunkRect(coordRectPair[0], coordRectPair[1][0], coordRectPair[1][1]);
    // }

    this.renderView();
    this.redrawPending = false;
    // this.chunkPendingRects.clear();
  }

  private renderView() {
    if (this.visibleMin === null || this.visibleMax === null) {
      throw "can't render view when visiblemin/max are null!";
    }
    this.ctx.clearRect(0, 0, this.dims.x, this.dims.y);

    // for (let x = this.visibleMin.x; x <= this.visibleMax.x; x++) {
    //   for (let y = this.visibleMin.y; y <= this.visibleMax.y; y++) {
    //     const chunkColorData = this.cachedChunkColorData.get(NPoint.toHash(x, y));
    //     if (chunkColorData !== undefined) {
    //       this.ctx.putImageData(chunkColorData[1],
    //         Math.floor(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
    //         Math.floor(y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock));
    //     }
    //   }
    // }
    if (this.world === null) {
      throw "can't render view when world is null!";
    }

    for (let x = this.visibleMin.x; x <= this.visibleMax.x; x++) {
      for (let y = this.visibleMin.y; y <= this.visibleMax.y; y++) {
        const chunk = this.world.getChunk(x, y);
        if (chunk === undefined) {
          continue;
        }
        this.redrawChunkGPU(this.world, chunk);
        this.ctx.drawImage(
          this.shaderKernel.canvas,
          Math.floor(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
          Math.floor(y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock)
        );
        // this.ctx.putImageData(chunkColorData[1],
        //   Math.floor(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
        //   Math.floor(y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock));
      }
    }
  }

  private redrawChunkGPU(world: World, chunk: Chunk) {
    this.shaderKernel(
      [CHUNK_SIZE, CHUNK_BITSHIFT, chunk.coord.x, chunk.coord.y, world.getTime()],
      this.blockShaders,
      chunk.getBlockTypes(),
      chunk.getBlockIds()
    );
  }

  public unlink(): void {
    if (this.world === null) {
      return;
    }
    this.world = null;
    this.blockShaders = [];
  }

  public link(world: World): void {
    this.unlink();
    this.world = world;
    this.blockShaders = new Array(this.world.getBlockTypeCount());
    this.registerBlockShader("missing", { min: new Color(1, 0, 0), max: new Color(0, 0, 1) });
    this.recalcVisibleChunks();
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

