import { World } from "./base";
import { NPoint, ZERO } from "./lib/NLib/npoint";

export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private world: World | null = null;
  private viewDims: NPoint = new NPoint(256, 256);
  private viewOrigin: NPoint = ZERO;
  private initialized = false;
  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private displayScale = 1;

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

    // this.canvas.style.background = "none";

    (new ResizeObserver((es) => this.resizeCallbacks.forEach(c => c(es[0])))).observe(this.canvas);
    this.resizeCallbacks.push((e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.viewDims = new NPoint(rect.width, rect.height).multiply1(this.displayScale).round();
      console.log(this.viewDims);

      this.canvas.width = this.viewDims.x;
      this.canvas.height = this.viewDims.y;


    });
    let t = 0;
    window.setInterval(() => {
      t++;
      const dat = this.ctx.getImageData(0, 0, this.viewDims.x, this.viewDims.y).data;

      for (let x = 0; x < this.canvas.width; x++) {
        for (let y = 0; y < this.canvas.height; y++) {
          const i = (x + y * this.viewDims.x) << 2;
          dat[i] = x % 256;
          dat[i + 1] = (y + t) % 256;
          dat[i + 2] = ((Math.floor((x + t) / 64) % 2) ^ (Math.floor(y / 64) % 2)) * 255;
          dat[i + 3] = 255;
        }
      }
      this.ctx.putImageData(new ImageData(dat, this.viewDims.x, this.viewDims.y), 0, 0);
    }, 50);

    this.initialized = true;
  }

  public setViewDims(viewDims: NPoint): void {
    this.viewDims = viewDims;
    this.canvas.width = viewDims.x;
    this.canvas.height = viewDims.y;
  }

  public getViewDims(): NPoint {
    return this.viewDims;
  }
}
