import { NPoint } from "../lib/NLib/npoint";
import WorldHandler from "../world-handler";
import World from "../simulation/matrix-world";
import WorldGenerator from "../simulation/matrix-worldgen";
import BlockType from "../simulation/matrix-blocktype";
import { CHUNK_BITSHIFT, CHUNK_SIZE } from "../matrix-common";
import { mod } from "../library";

export default class MatrixServer extends WorldHandler {
  private readonly world: World;

  public handleReceivedChunkData;

  constructor(
    handleReceivedChunkData: (coord: NPoint, data: Uint16Array, lighting: Float32Array) => void,
    blockTypes: Array<BlockType>,
    worldGenGen: (world: World) => WorldGenerator,
  ) {
    super();
    this.handleReceivedChunkData = handleReceivedChunkData;

    this.world = new World(this, worldGenGen);
    for (const blockType of blockTypes) {
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

  public performGlobalTick(): void {
    this.world.performGlobalBlockTick();
  }

  public performGlobalLightTick(): void {
    this.world.performGlobalLightUpdate();
  }

  // index, type id
  public forwardSetBlockRequests(changes: [number, number, number, number][]): void {
    for (const [x, y, btype, rtype] of changes) {
      const cx = Math.floor(x / CHUNK_SIZE);
      const cy = Math.floor(y / CHUNK_SIZE);
      const chunk = this.world.getChunk(cx, cy);
      if (chunk !== undefined) {
        const bx = mod(x, CHUNK_SIZE);
        const by = mod(y, CHUNK_SIZE);
        // console.log(bx,by, );
        // chunk.setNextTypeOfBlock((bx + (by << CHUNK_BITSHIFT)), 4);
        // chunk.applyNexts();
        // TODO: figure out why this does not chang anything, but above (commented) code does
        this.world.pushClientBlockChangeRequest(chunk, bx + (by << CHUNK_BITSHIFT), btype, rtype);
        // this.world.trySetTypeOfBlock(chunk, , true);
      }
    }
  }
}