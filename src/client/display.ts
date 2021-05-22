import { CHUNK_SIZE, CHUNK_BITSHIFT, CHUNK_MODMASK } from "../matrix-common";
import { NPoint, ZERO } from "../lib/NLib/npoint";
import getShaderKernel from "./display-shader";
import { Color } from "../library";
import MatrixClient from "./client";

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
  // number, number, number, number,
  // number, number, number, number,
  number, number, number
];


const shader_missing: BlockShaderFactorList = [
  1, 0, 1,
  1, 0, 1,
  0,
  // 0,0,0,0,
  // 0,0,0,0,
  0, 0, 0
];
export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");

  private ctx: CanvasRenderingContext2D;

  // viewport origin, measured in pixels
  private viewOrigin: NPoint = ZERO;
  // viewport origin, measured in chunk coords
  private viewOriginCh: NPoint = ZERO;

  // viewport dimensions, measured in blocks
  private dims: NPoint = ZERO;
  // viewport dimensions, measured in chunks
  private dimsCh: NPoint = ZERO;

  private pixelsPerBlock = 8;
  private visiblePadding = 0;

  private visibleMin: NPoint | null = null;
  private visibleMax: NPoint | null = null;

  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private resizeFinishTimer: number | undefined = undefined;
  private awaitingResizeEnd = true;
  private resizeHappened = false;

  private redrawLoopRunning = false;


  private redrawPending = false;
  private client: MatrixClient;

  //TODO make this not-readonly (need to create a new interval)
  private readonly targetFPS = 30;
  private cacheBuffer = 0;

  private blockShaders: Array<BlockShaderFactorList> = [shader_missing];
  private shaderKernel;

  constructor(client: MatrixClient) {
    this.client = client;
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
  }

  public getViewOrigin(): NPoint {
    return this.viewOrigin;
  }

  public registerBlockShader(blockName: string, args: BlockShaderFactorMap): BlockShaderFactorList | null {
    const id = this.client.getBlockIdFromName(blockName) ?? 0;

    const argList: BlockShaderFactorList = [
      args.min.r, args.min.g, args.min.b,
      args.max.r, args.max.g, args.max.b,
      args.randFactor ?? 1,
      // args.noise1Factor ?? 0, args.noise1ScaleX ?? 0.1, args.noise1ScaleY ?? 0.1, args.noise1ScaleTime ?? 0,
      // args.noise2Factor ?? 0, args.noise2ScaleX ?? 0.1, args.noise2ScaleY ?? 0.1, args.noise2ScaleTime ?? 0,
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
    if (!this.resizeHappened) {
      return;
    }
    const newMinX = Math.floor(-this.viewOriginCh.x) - this.visiblePadding;
    const newMinY = Math.floor(this.viewOriginCh.y - this.dimsCh.y) + 1 - this.visiblePadding;
    const newMaxX = Math.floor(this.dimsCh.x - this.viewOriginCh.x) + this.visiblePadding;
    const newMaxY = Math.floor(this.viewOriginCh.y) + 1 + this.visiblePadding;
    if (this.visibleMin === null || this.visibleMax === null) {
      this.visibleMin = new NPoint(newMinX, newMinY);
      this.visibleMax = new NPoint(newMaxX, newMaxY);


      // nothing loaded yet; load everything in range
      const toLoads: Array<[number, number]> = [];
      for (let x = newMinX; x <= newMaxX; x++) {
        for (let y = newMinY; y <= newMaxY; y++) {
          toLoads.push([x, y]);
          // this.requestChunkRedraw(new NPoint(x, y));
        }
      }
      this.client.requestChunkLoads(toLoads);
    } else {
      // something already loaded; update 
      const oldMinX = this.visibleMin.x;
      const oldMinY = this.visibleMin.y;
      const oldMaxX = this.visibleMax.x;
      const oldMaxY = this.visibleMax.y;

      if (newMinX !== oldMinX || newMaxX !== oldMaxX || newMinY !== oldMinY || newMaxY !== oldMaxY) {
        const toUnloads: Array<[number, number]> = [];
        for (let x = oldMinX; x <= oldMaxX; x++) {
          for (let y = oldMinY; y <= oldMaxY; y++) {
            if (x < newMinX || x > newMaxX || y < newMinY || y > newMaxY) {
              toUnloads.push([x, y]);
            }
          }
        }
        this.client.requestChunkUnloads(toUnloads);

        const toLoads: Array<[number, number]> = [];
        for (let x = newMinX; x <= newMaxX; x++) {
          for (let y = newMinY; y <= newMaxY; y++) {
            if (x < oldMinX || x > oldMaxX || y < oldMinY || y > oldMaxY) {
              toLoads.push([x, y]);
            }
          }
        }
        this.client.requestChunkLoads(toLoads);
      }
    }
    this.visibleMin = new NPoint(newMinX, newMinY);
    this.visibleMax = new NPoint(newMaxX, newMaxY);
  }

  public startDrawLoop(): void {
    if (this.redrawLoopRunning) {
      return;
    }

    const boundRedraw = this.renderView.bind(this);
    window.setInterval(() => {
      if (!this.redrawPending && this.resizeHappened) {
        this.redrawPending = true;
        window.requestAnimationFrame(boundRedraw);
      }
    }, ~~(1000 / this.targetFPS));

    this.redrawLoopRunning = true;
  }

  private renderView() {
    if (this.visibleMin === null || this.visibleMax === null) {
      throw "can't render view when visiblemin/max are null!";
    }
    this.ctx.clearRect(0, 0, this.dims.x, this.dims.y);
    
    const limitedTimeMillis = Date.now() & 0xffffffffffff;

    for (let x = this.visibleMin.x; x <= this.visibleMax.x; x++) {
      for (let y = this.visibleMin.y; y <= this.visibleMax.y; y++) {
        const chunkData = this.client.getChunkData(x, y);
        if (chunkData === null) {
          continue;
        }
        this.shaderKernel(
          [CHUNK_SIZE, CHUNK_BITSHIFT, chunkData.coord.x, chunkData.coord.y, limitedTimeMillis],
          this.blockShaders,
          chunkData.types,
          chunkData.ids
        );
        this.ctx.drawImage(
          this.shaderKernel.canvas,
          Math.floor(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
          Math.floor(this.visibleMax.y - y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock)
        );
      }
    }

    this.redrawPending = false;
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

