import { Texture, IKernelRunShortcutBase, KernelOutput } from "gpu.js";
import { NPoint, PointStr } from "../lib/NLib/npoint";
import { ANTIDIRS, Color, DIRECTIONS, iterFilter, mixRands, Neighbors, shuffleArray } from "../library";
import { CHUNK_BITSHIFT, CHUNK_MODMASK, CHUNK_SIZE, CHUNK_SIZE2, CHUNK_SIZE2m1, CHUNK_SIZEm1 } from "../matrix-common";
import WorldHandler from "../world-handler";
import getLightKernel from "./light-shader";
import BlockType from "./matrix-blocktype";
import Chunk, { BlockData, BlockLightFactorList, UpdateFlags } from "./matrix-chunk";
import WorldGenerator from "./matrix-worldgen";

/**
 * block type that represents a missing block type
 */
const bt_missing: BlockType = new BlockType({
  name: "missing",
  color: new Color(1, 0, 1),
});

// const chunkImporter = new TextEncoder();
// const chunkExporter = new TextDecoder("utf-16");

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
  private readonly storedChunks: Map<PointStr, [Uint16Array, Uint8Array, Float32Array]> = new Map();
  private readonly loadedChunks: Map<PointStr, Chunk> = new Map();
  private readonly worldGenGen: (world: World) => WorldGenerator;
  private worldGen?: WorldGenerator;
  private readonly blockTypes: Array<BlockType> = [];
  private readonly blockTypeMap: Map<string, number> = new Map();
  private readonly blockTypeLightFactors: Array<BlockLightFactorList> = [];
  private time = 0;
  private rand = 1;
  private initialized = false;
  public readonly handler: WorldHandler;
  private randomTicksPerTick = 64;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pipelineLightKernel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private outputLightKernel: any;

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

    this.pipelineLightKernel = getLightKernel(CHUNK_BITSHIFT).setPipeline(true).setImmutable(true);
    this.outputLightKernel = getLightKernel(CHUNK_BITSHIFT);

    this.worldGen = this.worldGenGen(this);
    this.worldGen.runInit();
    this.initialized = true;
    return true;
  }

  public setBlockData(chunk: Chunk, i: number, data: BlockData): void {
    chunk.setNextBlockData(i, data);
    chunk.setBlockFlagOn(i, UpdateFlags.LOCKED);
    this.queueNeighbors(chunk, i, true);
  }

  /**
   * THIS ONLY WORKS IF IT HAPPENS WITHIN THE GLOBAL TICK,
   * because resetNexts() will clear any changes
   */
  public trySetTypeOfBlock(chunk: Chunk, i: number, typeId: number, force = false): boolean {
    if (force || !chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
      // // reset creation time
      // chunk.setNextCreationTimeOfBlock(i, this.time);
      // reset id
      this.rand = mixRands(this.rand, i + this.time);
      chunk.setNextBlockId(i, mixRands(this.rand, i) & 0b11111111);
      // actually set type
      this.tryMutateTypeOfBlock(chunk, i, typeId, true);
      return true;
    }
    return false;
  }

  /**
   * THIS ONLY WORKS IF IT HAPPENS WITHIN THE GLOBAL TICK,
   * because resetNexts() will clear any changes
   */
  public tryMutateTypeOfBlock(chunk: Chunk, i: number, typeId: number, force = false): boolean {
    if (force || !chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
      // set type (for the next iteration)
      chunk.setNextTypeOfBlock(i, typeId);
      chunk.setBlockFlagOn(i, UpdateFlags.LOCKED);

      this.queueNeighbors(chunk, i, true);
      return true;
    }
    return false;
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

      const chunk = this.loadedChunks.get(ch);
      if (chunk !== undefined) {
        // clear neighbors' reference to unloaded chunk
        for (let i = 0; i < 8; i++) {
          const neighbor = this.getChunk(x + DIRECTIONS[i].x, y + DIRECTIONS[i].y);
          if (neighbor !== undefined) {
            neighbor.neighbors[ANTIDIRS[i]] = null;
          }
        }

        // store
        if (chunk.needsSaving) {
          this.storedChunks.set(ch, [chunk.getBlockData(), chunk.getBlockFlags(), chunk.lighting]);
        }

        // unload
        this.loadedChunks.delete(ch);
      }
    } else {
      this.chunkLoadRequests.set(ch, count - 1);
    }
  }

  public pushClientBlockChangeRequest(chunk: Chunk, i: number, btype: number): void {
    chunk.pendingClientChanges.push([i, btype]);
    this.queueNeighbors(chunk, i, true);
  }

  /**
   * Logic update for all pending blocks
   */
  public performGlobalBlockTick(): void {
    if (!this.initialized) {
      throw "Attempted global tick before initialization";
    }
    if (this.loadedChunks.size === 0) {
      return;
    }

    // make scrambled list of pending chunks
    const pendingChunks = Array.from(iterFilter(this.loadedChunks.values(), (c) => c.pendingTick));
    shuffleArray(this.getRandomFloatBound, pendingChunks);

    // reset nexts
    for (const chunk of pendingChunks) {
      chunk.resetNexts();
    }

    // apply client changes
    for (const chunk of pendingChunks) {
      for (const [i, btype] of chunk.pendingClientChanges) {
        this.trySetTypeOfBlock(chunk, i, btype, true);
      }
      if (chunk.pendingClientChanges.length > 0) {
        chunk.pendingClientChanges.length = 0;
      }
    }

    // perform random ticks
    const loadedChunks = Array.from(this.loadedChunks.values());
    shuffleArray(this.getRandomFloatBound, loadedChunks);
    for (const chunk of loadedChunks) {
      for (let n = 0; n < this.randomTicksPerTick; n++) {
        const i = ~~(this.getRandomFloat() * CHUNK_SIZE2);
        if (!chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
          this.blockTypes[chunk.getTypeIndexOfBlock(i)].doRandomTick(this, chunk, i);
        }
      }
    }

    // perform updates
    for (const chunk of pendingChunks) {
      shuffleArray(this.getRandomFloatBound, chunk.blocksPendingTick);
      for (const i of chunk.blocksPendingTick) {
        if (!chunk.getFlagOfBlock(i, UpdateFlags.LOCKED)) {
          this.blockTypes[chunk.getTypeIndexOfBlock(i)].doTick(this, chunk, i);
        }
      }
    }

    // apply nexts, and tell chunks to save themselves upon unload
    for (const chunk of pendingChunks) {
      chunk.applyNexts();
      chunk.needsSaving = true;
    }

    // forward changes to server/handler
    for (const chunk of loadedChunks) {
      // this.handler.sendChunkData(chunk.coord, {
      //   types: chunk.getBlockTypes(),
      //   ids: chunk.getBlockIds(),
      // });
      this.handler.sendChunkData(chunk.coord, chunk.getBlockData(), chunk.lighting);
    }

    // apply/flush the pendingPending buffer
    for (const chunk of pendingChunks) {
      chunk.blocksPendingTick = chunk.blocksPendingPendingTick;
      chunk.pendingTick = chunk.blocksPendingTick.length > 0;
      chunk.blocksPendingPendingTick = [];
    }

    this.time++;
  }

  public performGlobalLightUpdate(): void {
    for (const [co, chunk] of this.loadedChunks) {
      this.performLightUpdate(chunk);
    }
  }


  public performLightUpdate(chunk: Chunk): void {
    if (this.pipelineLightKernel === undefined || this.outputLightKernel === undefined) {
      throw "no light kernel!";
    }

    // light values at edges of adjacent chunks
    const edges = new Float32Array(CHUNK_SIZE * 4);

    const upperChunk = chunk.neighbors[Neighbors.UP];
    if (upperChunk !== null) {
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[i] = upperChunk.lighting[i];
      }
    } else {
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[i] = 0;
      }
    }
    const lowerChunk = chunk.neighbors[Neighbors.DOWN];
    if (lowerChunk !== null) {
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[CHUNK_SIZE + i] = lowerChunk.lighting[i + CHUNK_SIZE * CHUNK_SIZEm1];
      }
    }else{
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[CHUNK_SIZE + i] = 0;
      }
    }
    const leftChunk = chunk.neighbors[Neighbors.LEFT];
    if (leftChunk !== null) {
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[(CHUNK_SIZE  * 2) + i] = leftChunk.lighting[((i + 1) << CHUNK_BITSHIFT) - 1];
      }
    }else{
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[(CHUNK_SIZE  * 2) + i] = 0;
      }
    }
    const rightChunk = chunk.neighbors[Neighbors.RIGHT];
    if (rightChunk !== null) {
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[(CHUNK_SIZE * 3) + i] = rightChunk.lighting[i << CHUNK_BITSHIFT];
      }
    }else{
      for (let i = 0; i < CHUNK_SIZE; i++) {
        edges[(CHUNK_SIZE * 3) + i] = 0;
      }
    }


    const piped = this.pipelineLightKernel(chunk.lighting, edges, chunk.getBlockData(), this.blockTypeLightFactors);
    chunk.lighting = this.outputLightKernel(
      piped,
      edges,
      chunk.getBlockData(),
      this.blockTypeLightFactors);
    
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
    return this.getBlockType(chunk.getTypeIndexOfBlock(index)).getDensity(this, chunk, index);
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

    this.blockTypeLightFactors.push([
      ~~(type.emission.r * 255), ~~(type.emission.g * 255), ~~(type.emission.b * 255),
      type.opacity.r, type.opacity.g, type.opacity.b,
    ]);

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
   * if chunk is loaded, return it; 
   * if that fails, generate it
   * 
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


    // pull from storage
    let chunk;
    const storedData = this.storedChunks.get(ch);
    if (storedData !== undefined) {
      chunk = new Chunk(x, y, storedData[0], storedData[1], storedData[2]);
    } else {
      // create new chunk
      chunk = new Chunk(x, y);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.worldGen!.generate(this, x, y, chunk);

      // randomize ids
      let rand = mixRands(x, y);
      for (let i = 0; i < CHUNK_SIZE2; i++) {
        rand = mixRands(rand, i);
        chunk.setCurrentIdOfBlock(i, rand & 0b11111111);
      }

    }

    // // update chunk
    // for (let i = 0; i < CHUNK_SIZE2; i++) {
    //   this.queueBlock(chunk, i);
    // }
    this.performLightUpdate(chunk);

    this.loadedChunks.set(ch, chunk);

    // assign neighbors
    for (let i = 0; i < 8; i++) {
      const neighbor = this.getChunk(x + DIRECTIONS[i].x, y + DIRECTIONS[i].y);
      if (neighbor !== undefined) {
        chunk.neighbors[i] = neighbor;
        neighbor.neighbors[ANTIDIRS[i]] = chunk;
      }
    }

    this.handler.sendChunkData(chunk.coord, chunk.getBlockData(), chunk.lighting);
    return chunk;
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