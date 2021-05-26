import { NPoint, PointStr } from "./lib/NLib/npoint";

// export type PartialChunkData = {
//   types?: Uint8ClampedArray,
//   ids?: Uint8ClampedArray,
// }


export default abstract class WorldHandler {
  private readonly chunkLoadRequests: Map<PointStr, number> = new Map();

  public sendChunkData(coord: NPoint, data: Uint16Array): void {
    this.handleReceivedChunkData(coord, data);
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
    this.forwardChunkLoadRequests(toLoads);
  }

  protected abstract forwardChunkLoadRequests(toLoads: Array<[number, number]>): void;

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
    this.forwardChunkUnloadRequests(toUnloads);
  }

  protected abstract forwardChunkUnloadRequests(toUnloads: Array<[number, number]>): void;

  public abstract handleReceivedChunkData(coord: NPoint, data: Uint16Array): void;
}