import { World } from "./base";
import { NPoint, ZERO } from "./lib/NLib/npoint";
import { Color } from "./library";

export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private world: World | null = null;
  private dims: NPoint = new NPoint(256, 256);
  private viewOrigin: NPoint = ZERO;
  private initialized = false;
  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private displayScale = 0.5;

  private resizeFinishTimer : number|undefined = undefined;
  private isResizing = true;

  public init(): void {
    if (this.initialized) {
      return;
    }

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      throw "failed to get canvas context";
      return;
    }
    this.ctx = ctx;
    this.canvas.style.imageRendering = "pixelated";

    // this.canvas.style.background = "none";

    (new ResizeObserver((es) => {
      window.clearTimeout(this.resizeFinishTimer);
      this.isResizing = true;
      this.resizeFinishTimer = window.setTimeout(() => {
        this.resizeCallbacks.forEach(c => c(es[0]));
        this.isResizing = false;
      }, 250);
    })).observe(this.canvas);

    this.resizeCallbacks.push((e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.dims = new NPoint(rect.width, rect.height).multiply1(this.displayScale).round();
      console.log(this.dims);

      this.canvas.width = this.dims.x;
      this.canvas.height = this.dims.y;
    });
    
    // redraw
    window.setInterval(() => {
      if(this.isResizing){
        return;
      }

    }, 50);

    this.initialized = true;
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

  public setViewDims(viewDims: NPoint): void {
    this.dims = viewDims;
    this.canvas.width = viewDims.x;
    this.canvas.height = viewDims.y;
  }

  public getViewDims(): NPoint {
    return this.dims;
  }
}
