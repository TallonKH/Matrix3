import { World, CHUNK_SIZE, CHUNK_MODMASK, CHUNK_BITSHIFT } from "./base";
import { NPoint, ZERO } from "./lib/NLib/npoint";

export default class GridDisplay {
  public readonly canvas: HTMLCanvasElement = document.createElement("canvas");

  private ctx: CanvasRenderingContext2D;
  private world: World | null = null;
  private worldDrawListenerId = -1;

  private viewOrigin: NPoint = ZERO;
  private dims: NPoint = new NPoint(4, 4);
  private pixelsPerBlock = 4;

  private visibleMin: NPoint | null = null;
  private visibleMax: NPoint | null = null;
  
  private readonly resizeCallbacks: Array<(e: ResizeObserverEntry) => void> = [];
  private resizeFinishTimer: number | undefined = undefined;
  private isResizing = true;
  private resizeHappened = false;

  /**
   * rectangular regions pending redraw within chunks (local coords)
   */
  private chunkPendingRects: Map<NPoint, [number, number, number, number]> = new Map();

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
      this.isResizing = true;
      this.resizeFinishTimer = window.setTimeout(() => {
        this.resizeCallbacks.forEach(c => c(es[0]));
        this.isResizing = false;
        this.resizeHappened = true;
      }, 250);
    })).observe(this.canvas);

    // add a resizeCallback for setting the canvas dimensions to the element dimensions
    this.resizeCallbacks.push(() => {
      const rect = this.canvas.getBoundingClientRect();
      this.dims = new NPoint(rect.width, rect.height).divide1(this.pixelsPerBlock).round();

      this.canvas.width = this.dims.x;
      this.canvas.height = this.dims.y;
      this.recalcVisibleChunks();
    });

    document.addEventListener("mousemove", (e) => {
      this.viewOrigin = new NPoint(e.offsetX, e.offsetY);
    });

    // redraw
    window.setInterval(() => {
      if (this.isResizing) {
        return;
      }
      this.drawDebugChunks(); 
      this.recalcVisibleChunks();
    }, 100);
  }

  public setViewOrigin(pt: NPoint): NPoint {
    this.viewOrigin = pt;
    this.recalcVisibleChunks();
    return pt;
  }

  // this is not efficient; replace with more efficient thing later
  public recalcVisibleChunks(): void {
    if (!this.resizeHappened || this.world === null) {
      return;
    }
    const vx = (this.viewOrigin.x / this.pixelsPerBlock) / CHUNK_SIZE;
    const vy = (this.viewOrigin.y / this.pixelsPerBlock) / CHUNK_SIZE;
    const sx = Math.floor(-vx);
    const sy = Math.floor(-vy);
    const ex = Math.floor((this.dims.x / CHUNK_SIZE) - vx);
    const ey = Math.floor((this.dims.y / CHUNK_SIZE) - vy);
    const newMin = new NPoint(sx, sy);
    const newMax = new NPoint(ex, ey);

    if (this.visibleMin === null) {
      // nothing loaded yet; load everything in range
      this.world.forArea(sx, sy, ex, ey, this.world.requestChunkLoad.bind(this.world));
    } else {
      // something already loaded; update 
    }

    this.visibleMin = newMin;
    this.visibleMax = newMax;
  }

  public link(world: World): void {
    this.unlink();
    this.world = world;

    this.world.registerRedrawListener((chunk, i) => {
      
    });
    this.recalcVisibleChunks();
  }

  public unlink(): void {
    if (this.world === null) {
      return;
    }
    this.world.unregisterRedrawListener(this.worldDrawListenerId);
    this.world = null;
  }

  drawDebugChunks(): void {
    if (this.world === null) {
      return;
    }

    const vox = this.viewOrigin.x / this.pixelsPerBlock;
    const voy = this.viewOrigin.y / this.pixelsPerBlock;
    const vodX = vox >> CHUNK_BITSHIFT;
    const vodY = voy >> CHUNK_BITSHIFT;

    for (let x = -1; x < this.dims.x / CHUNK_SIZE; x++) {
      for (let y = -1; y < this.dims.y / CHUNK_SIZE; y++) {
        const vx = ~~(x * CHUNK_SIZE + (vox & CHUNK_MODMASK));
        const vy = ~~(y * CHUNK_SIZE + (voy & CHUNK_MODMASK));

        const cx = x - vodX;
        const cy = y - vodY;

        const exists = this.world.isChunkLoaded(cx, cy);
        this.fillSquare(
          vx, vy,
          CHUNK_SIZE, CHUNK_SIZE,
          exists ? 0 : 1, exists ? 1 : 0, (cx ? 1 : 0) ^ (cy ? 1 : 0)
        );

        this.strokeSquare(
          vx, vy,
          CHUNK_SIZE, CHUNK_SIZE,
          Math.abs(cx / 10), Math.abs(cy / 10), (cx ? 1 : 0) ^ (cy ? 1 : 0)
        );
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
