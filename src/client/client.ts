import GridDisplay from "./display";
import { NPoint, PointStr } from "../lib/NLib/npoint";
import WorldHandler from "../world-handler";

type ChunkData = {
  coord: NPoint,
  // types: Uint8ClampedArray,
  // ids: Uint8ClampedArray
  data: Uint16Array,
  lighting: Float32Array,
}

export default class MatrixClient extends WorldHandler {
  public forwardChunkLoadRequests;
  public forwardChunkUnloadRequests;
  constructor(
    forwardChunkLoadRequests: (toLoads: [number, number][]) => void,
    forwardChunkUnloadRequests: (toUnloads: [number, number][]) => void
  ) {
    super();
    this.forwardChunkLoadRequests = forwardChunkLoadRequests;
    this.forwardChunkUnloadRequests = forwardChunkUnloadRequests;
  }
  // // forward requests from displays to the server
  // protected forwardChunkLoadRequests(toLoads: [number, number][]): void {
  //   postMessage(["loadChunks", toLoads]);
  // }

  // // forward requests from displays to the server
  // protected forwardChunkUnloadRequests(toUnloads: [number, number][]): void {
  //   postMessage(["unloadChunks", toUnloads]);
  // }

  private readonly displays: Set<GridDisplay> = new Set();
  private readonly chunkData: Map<PointStr, ChunkData> = new Map();
  private blockTypeNameIdMap: Map<string, number>;

  public handleReceivedChunkData(coord: NPoint, data: Uint16Array, lighting: Float32Array): void {
    const hash = coord.toHash();
    // const existing = this.chunkData.get(hash);
    // if (existing === undefined) {
    this.chunkData.set(hash, {
      coord: coord,
      // ids: data.ids,
      // types: data.types,
      data: data,
      lighting: lighting,
    });
    // } else {

    // existing.ids = data.ids ?? existing.ids;
    // existing.types = data.types ?? existing.types;
    // }
  }

  public sendBlockNames(blockTypeNames: Array<string>): void {
    this.blockTypeNameIdMap = new Map();
    for (let i = 0; i < blockTypeNames.length; i++) {
      // do i+1 because the 0th index is taken by 'missing'
      this.blockTypeNameIdMap.set(blockTypeNames[i], i + 1);
    }
  }

  public getChunkData(x: number, y: number): ChunkData | null {
    return this.chunkData.get(NPoint.toHash(x, y)) ?? null;
  }

  public createDisplay(): GridDisplay {
    const display = new GridDisplay(this);
    this.displays.add(display);
    return display;
  }

  public deleteDisplay(disp: GridDisplay): void {
    this.displays.delete(disp);
  }

  public getBlockIdFromName(name: string): number | undefined {
    return this.blockTypeNameIdMap.get(name);
  }
}