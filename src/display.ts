import { World } from "./base";
import { NPoint, ZERO } from "./lib/NLib/npoint";

export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");
  private world: World | null = null;
  private viewDims: NPoint = new NPoint(256, 256);
  private viewOrigin: NPoint = ZERO;
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;


    new ResizeObserver((es) => {
      console.log(es.length);
      for (const e of es) {
      }
    }).observe(this.canvas);
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
