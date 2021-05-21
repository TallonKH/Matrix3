import { NPoint, PointStr } from "../lib/NLib/npoint";
import { ANTIDIRS, Color, DIRECTIONS, mixRands, shuffleArray } from "../library";
import { CHUNK_BITSHIFT, CHUNK_MODMASK, CHUNK_SIZE, CHUNK_SIZE2 } from "../matrix-common";
import WorldHandler from "../world-handler";
import BlockType from "./matrix-blocktype";
import Chunk, { BlockData, UpdateFlags } from "./matrix-chunk";
import WorldGenerator from "./matrix-worldgen";

/**
 * block type that represents a missing block type
 */
const bt_missing: BlockType = new BlockType({
  name: "missing",
  color: new Color(1, 0, 1),
});

/**
 * fill the world with bt_missing
 */
class MissingWorldGen extends WorldGenerator {
  public init(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public generate(world: World, x: number, y: number, chunk: Chunk): void {
    // block type 0 = bt_missing
  }
}

export default class World {
  private readonly chunkLoadRequests: Map<PointStr, number> = new Map();
  private readonly loadedChunks: Map<PointStr, Chunk> = new Map();
  private readonly worldGenGen: (world: World) => WorldGenerator;
  private worldGen?: WorldGenerator;
  private readonly blockTypes: Array<BlockType> = [];
  private readonly blockTypeMap: Map<string, number> = new Map();
  private time = 0;
  private rand = 1;
  private initialized = false;
  public readonly handler : WorldHandler;

  constructor(handler: WorldHandler, worldGenGen: (world: World) => WorldGenerator) {
    this.handler = handler;
    this.registerBlockType(bt_missing);
    this.worldGenGen = worldGenGen ?? ((world: World) => new MissingWorldGen(world));
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getBlockTypeCount(): number {
    return this.blockTypes.length;
  }

  public init(): boolean {
    if (this.initialized) {
      return true;
    }

    for (const blockType of this.blockTypes) {
      blockType.init(this);
    }

    this.worldGen = this.worldGenGen(this);
    this.worldGen.runInit();
    this.initialized = true;
    return true;
  }

  // public startTickLoop(targetTickrate: number): void {
  //   if (this.ticking) {
  //     throw "already ticking!";
  //   }
  //   this.ticking = true;

  //   window.setInterval(() => {
  //     this.performGlobalTick();
  //   }, ~~(1000 / targetTickrate));
  // }

  public getTypeOfBlock(chunk: Chunk, i: number): number {
    return chunk.getTypeOfBlock(i);
  }

  public setBlockData(chunk: Chunk, i: number, data: BlockData): void {
    chunk.setNextBlockData(i, data);
    chunk.setBlockFlagOn(i, UpdateFlags.LOCKED);
    this.queueNeighbors(chunk, i, true);
  }

  public trySetTypeOfBlock(chunk: Chunk, i: number, typeId: number, force = false): void {
    if (force || !chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
      // // reset creation time
      // chunk.setNextCreationTimeOfBlock(i, this.time);
      // reset id
      this.rand = mixRands(this.rand, i + this.time);
      chunk.setNextBlockId(i, mixRands(this.rand, i) & 0b11111111);
      // actually set type
      this.tryMutateTypeOfBlock(chunk, i, typeId, true);
    }
  }

  public tryMutateTypeOfBlock(chunk: Chunk, i: number, typeId: number, force = false): void {
    if (force || !chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
      // set type (for the next iteration)
      chunk.setNextTypeOfBlock(i, typeId);
      chunk.setBlockFlagOn(i, UpdateFlags.LOCKED);

      this.queueNeighbors(chunk, i, true);
    }
  }

  public queueBlock(chunk: Chunk, i: number): void {
    if (!chunk.getFlagOfBlock(i, UpdateFlags.PENDING_TICK)) {
      chunk.pendingTick = true;
      chunk.setBlockFlagOn(i, UpdateFlags.PENDING_TICK);
      chunk.blocksPendingPendingTick.push(i);
    }
  }

  public queueNeighbors(chunk: Chunk, i: number, enqueueSelf: boolean): void {
    chunk.forEachNeighbor(i & CHUNK_MODMASK, i >> CHUNK_BITSHIFT, this.queueBlock, enqueueSelf);
  }

  public forArea(ax: number, ay: number, bx: number, by: number, f: (x: number, y: number) => void): void {
    for (let x = ax; x <= bx; x++) {
      for (let y = ay; y <= by; y++) {
        f(x, y);
      }
    }
  }

  public requestChunkLoad(x: number, y: number): void {
    const ch = NPoint.toHash(x, y);
    const newCount = 1 + (this.chunkLoadRequests.get(ch) ?? 0);
    this.chunkLoadRequests.set(ch, newCount);
    if (newCount === 1) {
      this.acquireChunk(x, y);
    }
  }

  public requestChunkUnload(x: number, y: number): void {
    const ch = NPoint.toHash(x, y);
    const count = this.chunkLoadRequests.get(ch);
    if (count === 0 || count === undefined) {
      throw "requested to unload chunk that isn't loaded?";
      return;
    }

    if (count === 1) {
      this.chunkLoadRequests.delete(ch);
      // TODO store chunks instead of deleting them
      this.loadedChunks.delete(ch);
    } else {
      this.chunkLoadRequests.set(ch, count - 1);
    }
  }

  /**
   * Logic update for all pending blocks
   */
  public performGlobalTick(): void {
    if (!this.initialized) {
      throw "Attempted global tick before initialization";
    }

    // update pending chunks/blocks
    for (const [, chunk] of this.loadedChunks) {
      if (!chunk.pendingTick) {
        continue;
      }
      chunk.resetNexts();
    }
    const chunks = Array.from(this.loadedChunks.values());
    shuffleArray(this.getRandomFloatBound, chunks);
    for (const chunk of chunks) {
      if (!chunk.pendingTick) {
        continue;
      }

      shuffleArray(this.getRandomFloatBound, chunk.blocksPendingTick);
      for (const i of chunk.blocksPendingTick) {
        if (!chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
          this.blockTypes[chunk.getTypeOfBlock(i)].doTick(this, chunk, i);
        }
      }
    }
    for (const [, chunk] of this.loadedChunks) {
      if (!chunk.pendingTick) {
        continue;
      }
      chunk.applyNexts();
    }
    for(const [, chunk] of this.loadedChunks){
      if(chunk.pendingTick){
        this.handler.sendChunkData(chunk.coord, {
          types: chunk.getBlockTypes(),
          ids: chunk.getBlockIds(),
        });
      }
    }

    // apply/flush the pendingPending buffer
    for (const [, chunk] of this.loadedChunks) {
      if (!chunk.pendingTick) {
        continue;
      }
      chunk.pendingTick = false;

      chunk.blocksPendingTick = chunk.blocksPendingPendingTick;
      chunk.blocksPendingPendingTick = [];
    }

    this.time++;
  }

  /**
   * get a BlockType's index from its name
   */
  public getBlockTypeIndex(name: string): number | undefined {
    return this.blockTypeMap.get(name);
  }

  /**
   * get a reference to a BlockType by its index
   */
  public getBlockType(index: number): BlockType {
    return this.blockTypes[index];
  }

  public getDensityOfBlock(chunk: Chunk, index: number): number {
    return this.getBlockType(chunk.getTypeOfBlock(index)).getDensity(this, chunk, index);
  }


  public getRandom(): number {
    this.rand = mixRands(this.rand, this.time);
    return this.rand;
  }

  public getRandomFloat(): number {
    return this.getRandom() / 0xffffffff;
  }

  public getRandomFloatBound = this.getRandomFloat.bind(this);

  public registerBlockType(type: BlockType): undefined | number {
    if (this.blockTypeMap.has(type.name)) {
      return undefined;
    }
    const blockId: number = this.blockTypes.length;
    this.blockTypeMap.set(type.name, blockId);
    this.blockTypes.push(type);
    return blockId;
  }

  public *acqiureChunksInRange(origin: NPoint, dims: NPoint): Generator<Chunk> {
    const min = origin.divide1(CHUNK_SIZE).floor();
    const max = dims.divide1(CHUNK_SIZE).ceil();
    for (let x = min.x; x < max.x; x++) {
      for (let y = min.y; y < max.y; y++) {
        yield this.acquireChunk(x, y);
      }
    }
    return;
  }

  /**
   * impure; will create the chunk if it does not exist
   */
  public acquireChunk(x: number, y: number): Chunk {
    if (!this.initialized) {
      throw "Attempted to acquire a chunk before initialization";
    }

    const ch = NPoint.toHash(x, y);

    // check for existing chunk
    const existing: Chunk | undefined = this.loadedChunks.get(ch);
    if (existing !== undefined) {
      return existing;
    }

    // create new chunk
    const newChunk = new Chunk(x, y);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.worldGen!.generate(this, x, y, newChunk);

    // randomize ids
    let rand = mixRands(x, y);
    const ids = newChunk.getBlockIds();
    for (let i = 0; i < CHUNK_SIZE2; i++) {
      rand = mixRands(rand, i);
      ids[i] = rand;
    }
    rand = 0;

    for (let i = 0; i < CHUNK_SIZE2; i++) {
      this.queueBlock(newChunk, i);
    }
    this.loadedChunks.set(ch, newChunk);

    // assign neighbors
    for (let i = 0; i < 8; i++) {
      const neighbor = this.getChunk(x + DIRECTIONS[i].x, y + DIRECTIONS[i].y);
      if (neighbor !== undefined) {
        newChunk.neighbors[i] = neighbor;
        neighbor.neighbors[ANTIDIRS[i]] = newChunk;
      }
    }

    return newChunk;
  }

  public getChunk(x: number, y: number): Chunk | undefined {
    return this.loadedChunks.get(NPoint.toHash(x, y));
  }

  public getChunkByHash(h: string): Chunk | undefined {
    return this.loadedChunks.get(h);
  }
  public isChunkLoaded(x: number, y: number): boolean {
    return this.loadedChunks.has(NPoint.toHash(x, y));
  }

  public getTime(): number {
    return this.time;
  }
}