import { Chunk, World, CHUNK_SIZE, CHUNK_MODMASK, CHUNK_BITSHIFT } from "./base";
import { NPoint, ZERO } from "./lib/NLib/npoint";
import { Color } from "./library";

export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");
  private initialized = false;

  private ctx: CanvasRenderingContext2D;
  private world: World | null = null;

  private dims: NPoint = new NPoint(256, 256);
  private pixelsPerBlock = 4;
  private pixelsPerChunk = this.pixelsPerBlock * CHUNK_SIZE;

  private viewOrigin: NPoint = ZERO;

  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private resizeFinishTimer: number | undefined = undefined;
  private isResizing = true;
  private drawDebugChunks = true;

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

    this.resizeCallbacks.push(() => {
      const rect = this.canvas.getBoundingClientRect();
      this.dims = new NPoint(rect.width, rect.height).divide1(this.pixelsPerBlock).round();

      this.canvas.width = this.dims.x;
      this.canvas.height = this.dims.y;
    });

    document.addEventListener("mousemove", (e) => {
      this.viewOrigin = new NPoint(e.offsetX, e.offsetY);
    });

    // redraw
    window.setInterval(() => {
      if (this.isResizing) {
        return;
      }
      this.redrawWorld();
    }, 50);

    this.initialized = true;
  }

  public getPixelsPerBlock(): number {
    return this.pixelsPerBlock;
  }

  public setPixelsPerBlock(value: number): void {
    this.pixelsPerBlock = value;
    this.pixelsPerChunk = value * CHUNK_SIZE;
  }

  redrawWorld(): void {

    const vox = this.viewOrigin.x / this.pixelsPerBlock;
    const voy = this.viewOrigin.y / this.pixelsPerBlock;

    for (let x = -1; x < this.dims.x / CHUNK_SIZE; x++) {
      for (let y = -1; y < this.dims.y / CHUNK_SIZE; y++) {
        const vx = ~~(x * CHUNK_SIZE + (vox & CHUNK_MODMASK));
        const vy = ~~(y * CHUNK_SIZE + (voy & CHUNK_MODMASK));

        const cx = x - (vox >> CHUNK_BITSHIFT);
        const cy = y - (voy >> CHUNK_BITSHIFT);

        if(this.drawDebugChunks){
          this.fillSquare(
            vx, vy,
            CHUNK_SIZE, CHUNK_SIZE,
            Math.random() * 0.2, Math.random() * 0.2 + 0.8, Math.random() * 0.2 + 0.8
          );
          this.strokeSquare(
            vx, vy,
            CHUNK_SIZE, CHUNK_SIZE,
            Math.abs(cx / 10), Math.abs(cy / 10), (((cx ? 1 : 0) ^ (cy ? 1 : 0)) * 255)
          );
          this.ctx.textBaseline = "top";
          this.ctx.fillStyle = "black";
          this.ctx.fillText(`${cx}:${cy}`, vx, vy);
          this.ctx.textBaseline = "top";
          this.ctx.fillStyle = "red";
          this.ctx.fillText(`${vx}:${vy}`, vx, vy + 8);
        }
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
