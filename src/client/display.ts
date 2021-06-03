import { CHUNK_SIZE, CHUNK_BITSHIFT, CHUNK_MODMASK } from "../matrix-common";
import { NPoint, ZERO } from "../lib/NLib/npoint";
import getShaderKernel from "./display-shader";
import { Color } from "../library";
import MatrixClient from "./client";

export type BlockShaderFactorMap = {
  min: Color,
  mid1?: Color,
  mid2?: Color,
  max: Color,
  mid1x?: number,
  mid2x?: number,
  timeFactor1?: number, timeScale1?: number, timeOffsetFactor1?: number,
  timeFactor2?: number, timeScale2?: number, timeOffsetFactor2?: number,
  minBrightness?: number,
}

export type BlockShaderFactorList = [
  number, number, number, number, // 0=min r, 1=mid1 r, 2=mid2 r, 3=max r
  number, number, number, number, // 4=min g, 5=mid1 g, 6=mid2 g, 7=max g
  number, number, number, number, // 8=min b, 9=mid1 b, 10=mid2 b, 11=max b
  number, number, // 12=mid1x, 13=mid2x
  number, number, number, // 14=time1 factor, 15=time1 scale, 16=time1 offset factor
  number, number, number, // 17=time2 factor, 18=time2 scale, 19=time2 offset factor
  number, // 20=min brightness
];

const shaderArgsToFactorList = (args: BlockShaderFactorMap): BlockShaderFactorList => {
  return [
    args.min.r, (args.mid1?.r ?? args.min.r), (args.mid2?.r ?? args.max.r), args.max.r,
    args.min.g, (args.mid1?.g ?? args.min.g), (args.mid2?.g ?? args.max.g), args.max.g,
    args.min.b, (args.mid1?.b ?? args.min.b), (args.mid2?.b ?? args.max.b), args.max.b,
    args.mid1x ?? 0.001,
    args.mid2x ?? 0.999,
    args.timeFactor1 ?? 0, args.timeScale1 ?? 0, args.timeOffsetFactor1 ?? 1,
    args.timeFactor2 ?? 0, args.timeScale2 ?? 0, args.timeOffsetFactor2 ?? 1,
    args.minBrightness ?? 0.05,
  ];
};

const shader_missing: BlockShaderFactorList = shaderArgsToFactorList({
  min: Color.fromHex("#f0f"),
  max: Color.fromHex("#f0f"),
});

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

  private pixelsPerBlock = 12;
  private visiblePadding = 0;

  private visibleMin: NPoint | null = null;
  private visibleMax: NPoint | null = null;
  private visibleMaxFloat: NPoint | null = null;

  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private resizeFinishTimer: number | undefined = undefined;
  private awaitingResizeEnd = true;
  private resizeHappened = false;

  private redrawLoopRunning = false;


  private redrawPending = false;
  private client: MatrixClient;

  //TODO make this not-readonly (need to create a new interval)
  private readonly targetFPS = 20;
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
    this.canvas.classList.add("matrix-canvas");
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
      this.updateDims();
    });

    this.shaderKernel = getShaderKernel().setOutput([CHUNK_SIZE, CHUNK_SIZE]);
  }

  private updateDims(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dims = new NPoint(rect.width, rect.height).divide1(this.pixelsPerBlock).round();
    this.dimsCh = this.dims.divide1(CHUNK_SIZE);
    this.canvas.width = this.dims.x;
    this.canvas.height = this.dims.y;
    this.recalcVisibleChunks();
  }

  public setViewOrigin(pt: NPoint): void {
    this.viewOrigin = pt;
    this.viewOriginCh = pt.divide1(this.pixelsPerBlock * CHUNK_SIZE);
    this.recalcVisibleChunks();
  }

  public setPixelsPerBlock(val: number): void {
    this.pixelsPerBlock = val;
    this.setViewOrigin(this.viewOrigin);
    this.updateDims();
  }

  public getViewOrigin(): NPoint {
    return this.viewOrigin;
  }

  public registerBlockShader(blockName: string, args: BlockShaderFactorMap): BlockShaderFactorList | null {
    const id = this.client.getBlockIdFromName(blockName) ?? 0;

    const argList: BlockShaderFactorList = shaderArgsToFactorList(args);
    this.blockShaders[id] = argList;
    // console.log(this.blockShaders);
    return argList;
  }

  public offsetPosToBlockPos(x: number, y: number): NPoint | null {
    if (this.visibleMin === null || this.visibleMax === null) {
      return null;
    }
    return new NPoint(
      Math.floor((x - this.viewOrigin.x) / this.pixelsPerBlock),
      Math.floor((- y + this.viewOrigin.y) / this.pixelsPerBlock));
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
    const newMinY = Math.floor(this.viewOriginCh.y - this.dimsCh.y) - this.visiblePadding;
    const newMaxX = Math.floor(this.dimsCh.x - this.viewOriginCh.x) + this.visiblePadding;
    const newMaxY = Math.floor(this.viewOriginCh.y) + this.visiblePadding;

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
          [CHUNK_SIZE, CHUNK_BITSHIFT, chunkData.coord.x, chunkData.coord.y, limitedTimeMillis * 1.01],
          this.blockShaders,
          chunkData.data,
          chunkData.lighting,
          // chunkData.types,
          // chunkData.ids
        );
        const drawX = (x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock);
        const drawY = (this.visibleMax.y - this.visibleMin.y - 1) - ((y + 1) * CHUNK_SIZE) + (this.viewOrigin.y / this.pixelsPerBlock);
        this.ctx.drawImage(
          this.shaderKernel.canvas,
          Math.floor(drawX),
          Math.floor(drawY)
        );
        // this.ctx.textBaseline = "top";
        // this.ctx.fillStyle = "black";
        // this.ctx.fillText(`${x}:${y}`, drawX, drawY);
        // this.ctx.beginPath();
        // this.ctx.moveTo(
        //   ~~(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock),
        //   ~~(drawY + CHUNK_SIZE)
        // );
        // this.ctx.lineTo(
        //   ~~(x * CHUNK_SIZE + this.viewOrigin.x / this.pixelsPerBlock) + CHUNK_SIZE,
        //   ~~(- y * CHUNK_SIZE + this.viewOrigin.y / this.pixelsPerBlock) + CHUNK_SIZE
        // );
        // this.ctx.lineWidth = 1;
        // this.ctx.strokeStyle = "black";
        // this.ctx.stroke();
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

