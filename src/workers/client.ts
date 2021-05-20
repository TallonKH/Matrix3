import { CHUNK_SIZE2 } from "../base";
import GridDisplay from "../display";
import { NPoint, PointStr, ZERO } from "../lib/NLib/npoint";

type PartialChunkData = {
  types?: Uint8ClampedArray,
  ids?: Uint8ClampedArray,

}

type ChunkData = {
  coord: NPoint,
  types: Uint8ClampedArray,
  ids: Uint8ClampedArray
}

const NULL_CHUNK: ChunkData = {
  coord: ZERO,
  types: new Uint8ClampedArray(),
  ids: new Uint8ClampedArray(),
};

export class MatrixClient {
  private readonly displays: Set<GridDisplay> = new Set();
  private readonly chunkLoadRequests: Map<PointStr, number> = new Map();
  private readonly chunkData: Map<PointStr, ChunkData>

  public updateChunkData(x: number, y: number, data: PartialChunkData): void {
    const coord = new NPoint(x, y);
    const hash = coord.toHash();
    const existing = this.chunkData.get(hash);
    if (existing === undefined) {
      this.chunkData.set(hash, {
        coord: coord,
        types: data.types ?? new Uint8ClampedArray(CHUNK_SIZE2),
        ids: data.ids ?? new Uint8ClampedArray(CHUNK_SIZE2),
      });
    } else {
      existing.ids = data.ids ?? existing.ids;
      existing.types = data.types ?? existing.types;
    }
  }

  public getChunkData(x: number, y: number): ChunkData {
    return this.chunkData.get(NPoint.toHash(x, y)) ?? NULL_CHUNK;
  }

  public createDisplay(): GridDisplay {
    const display = new GridDisplay(this);
    this.displays.add(display);
    return display;
  }

  public deleteDisplay(disp: GridDisplay): void {
    this.displays.delete(disp);
  }

  public requestChunkLoads(coords: Array<[number, number]>): void {
    const toLoads: Array<[number, number]> = [];
    for (const coord of coords) {
      const ch = NPoint.toHash(coord[0], coord[1]);
      const newCount = 1 + (this.chunkLoadRequests.get(ch) ?? 0);
      this.chunkLoadRequests.set(ch, newCount);
      if (newCount === 1) {
        toLoads.push(coord);
      }
    }
    postMessage(["loadChunks", toLoads]);
  }

  public requestChunkUnloads(coords: Array<[number, number]>): void {
    const toUnloads: Array<[number, number]> = [];
    for (const coord of coords) {
      const ch = NPoint.toHash(coord[0], coord[1]);
      const count = this.chunkLoadRequests.get(ch);
      if (count === 0 || count === undefined) {
        throw "requested to unload chunk that isn't loaded?";
      }

      if (count === 1) {
        toUnloads.push(coord);
        this.chunkLoadRequests.delete(ch);
      } else {
        this.chunkLoadRequests.set(ch, count - 1);
      }
    }
    postMessage(["unloadChunks", toUnloads]);
  }
}