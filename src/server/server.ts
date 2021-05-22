import { NPoint } from "../lib/NLib/npoint";
import WorldHandler, { PartialChunkData } from "../world-handler";
import World from "../simulation/matrix-world";
import WorldGenerator from "../simulation/matrix-worldgen";
import BlockType from "../simulation/matrix-blocktype";

export default class MatrixServer extends WorldHandler {
  private readonly world: World;

  public handleReceivedChunkData;

  constructor(
    handleReceivedChunkData: (coord: NPoint, data: PartialChunkData) => void,
    blockTypes: Array<BlockType>,
    worldGenGen: (world: World) => WorldGenerator,
  ) {
    super();
    this.handleReceivedChunkData = handleReceivedChunkData;

    this.world = new World(this, worldGenGen);
    for(const blockType of blockTypes){
      this.world.registerBlockType(blockType);
    }
    this.world.init();
  }

  // public registerClient(client: MatrixClient): void {
  //   this.clients.add(client);
  // }

  // public unregisterClient(client: MatrixClient): void {
  //   this.clients.delete(client);
  // }

  // public handleReceivedChunkData(coord: NPoint, data: PartialChunkData): void {
  //   // for (const client of this.clients) {
  //   //   client.sendChunkData(coord, data);
  //   // }
  // }

  // forward requests from clients to the world
  protected forwardChunkLoadRequests(toLoads: [number, number][]): void {
    for (const [x, y] of toLoads) {
      this.world.requestChunkLoad(x, y);
    }
  }

  // forward requests from clients to the world
  protected forwardChunkUnloadRequests(toUnloads: [number, number][]): void {
    for (const [x, y] of toUnloads) {
      this.world.requestChunkUnload(x, y);
    }
  }

  public performGlobalTick(): void{
    this.world.performGlobalTick();
  }
}