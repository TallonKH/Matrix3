import { NPoint, PointStr, ZERO } from "./lib/NLib/npoint";
import { Color, mixRands, shuffleArray } from "./library";
// import {GPU} from "gpu.js";
// various common derivations of chunk size
export const CHUNK_BITSHIFT = 6;
export const CHUNK_SIZE = 1 << CHUNK_BITSHIFT;
/**
 * for use in quick modulo
 * n & CHUNK_MODMASK == n % CHUNK_SIZE
 */
export const CHUNK_MODMASK = CHUNK_SIZE - 1; // 0b11111
/**
 * Chunk size minus one
 */
export const CHUNK_SIZEm1 = CHUNK_SIZE - 1;
/**
 * Chunk size squared
 */
export const CHUNK_SIZE2 = CHUNK_SIZE * CHUNK_SIZE;
/**
 * Chunk size squared, minus 1
 */
export const CHUNK_SIZE2m1 = CHUNK_SIZE * (CHUNK_SIZE - 1);

export type GlobalCoord = NPoint;
export type LocalCoord = NPoint;

// Block Tick Behavior
export type TickBehavior = (world: World, chunk: Chunk, index: number) => void;
// eslint-disable-next-line no-empty-function
export const updateStatic: TickBehavior = () => { };

// Block Density Function
export type DensityFunc = (world: World, chunk: Chunk, index: number) => number;
export const densityConstant: (val: number) => DensityFunc = (val) => (() => val);

export type BlockData = {
  // creationTime: number,
  id: number,
  type: number 
};

interface BlockTypeArgs {
  name: string,
  color: Color,
  tickBehaviorGen?: (world: World) => TickBehavior,
  densityFunc?: DensityFunc,
}

export class BlockType {
  public readonly name: string;
  public readonly color: Color;
  public readonly tickBehaviorGen?: (world: World) => TickBehavior;
  private tickBehavior: TickBehavior;
  private densityFunc: DensityFunc;
  private initialized = false;

  constructor({ name, color, tickBehaviorGen, densityFunc }: BlockTypeArgs) {
    this.name = name;
    this.color = color;
    this.tickBehaviorGen = tickBehaviorGen;
    this.tickBehavior = updateStatic;
    this.densityFunc = densityFunc ?? densityConstant(255);
  }

  public doTick: TickBehavior = (world: World, chunk: Chunk, index: number) => this.tickBehavior(world, chunk, index);

  public getDensity: DensityFunc = (world: World, chunk: Chunk, index: number) => this.densityFunc(world, chunk, index);

  public init(world: World): void {
    if (this.initialized) {
      throw "BlockType already initialized!";
    }

    this.initialized = true;
    if (this.tickBehaviorGen !== undefined) {
      this.tickBehavior = this.tickBehaviorGen(world);
    }
  }
}

/**
 * block type that represents a missing block type
 */
export const bt_missing: BlockType = new BlockType({
  name: "missing",
  color: new Color(1, 0, 1),
});

export enum UpdateFlags {
  PENDING_TICK = 0,
  LOCKED = 1,
}

enum Neighbors {
  UP = 0,
  UP_RIGHT = 1,
  RIGHT = 2,
  DOWN_RIGHT = 3,
  DOWN = 4,
  DOWN_LEFT = 5,
  LEFT = 6,
  UP_LEFT = 7,
  CENTER = 8
}

const DIRECTIONS = [
  new NPoint(0, 1), new NPoint(1, 1), new NPoint(1, 0),
  new NPoint(1, -1), new NPoint(0, -1), new NPoint(-1, -1),
  new NPoint(-1, 0), new NPoint(-1, 1), ZERO
];

const ANTIDIRS = [4, 5, 6, 7, 0, 1, 2, 3, 8];

const NEIGHBOR_OFFSETS: Readonly<Array<Array<number>>> = Object.freeze([
  [Neighbors.DOWN_LEFT, Neighbors.LEFT, Neighbors.UP_LEFT],
  [Neighbors.DOWN, Neighbors.CENTER, Neighbors.UP],
  [Neighbors.DOWN_RIGHT, Neighbors.RIGHT, Neighbors.UP_RIGHT]
]);
/**
 * Chunk's fields are public because this is essentially a compound data structure.
 * Chunk shouldn't contain any real logic.
 */
export class Chunk {
  public pendingTick = false;
  // store by id, not coord
  public blocksPendingTick: Array<number> = [];
  public blocksPendingPendingTick: Array<number> = [];

  // public readonly light: Grid32 = new Uint32Array(CHUNK_SIZE2);

  public neighbors: Array<Chunk | null> = Object.seal([null, null, null, null, null, null, null, null, this]);
  /**
   * 0: pending tick
   * 1: ~~received tick~~
   * 2: locked
   */
  private readonly flags: Uint8Array = new Uint8Array(CHUNK_SIZE2);
  private readonly flagsNext: Uint8Array = new Uint8Array(CHUNK_SIZE2);

  // private readonly creationTimes: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2); // wraps around
  // private readonly creationTimesNext: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  private readonly ids: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2); // ids are not unique; just random
  private readonly idsNext: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  private readonly temps: Uint8Array = new Uint8Array(CHUNK_SIZE2); // ids are not unique; just random
  private readonly tempsNext: Uint8Array = new Uint8Array(CHUNK_SIZE2);
  private readonly types: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  private readonly typesNext: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);

  public readonly x: number;
  public readonly y: number;
  public readonly coord: NPoint;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.coord = new NPoint(x, y);
  }

  public getBlockData(i: number): BlockData {
    return {
      // creationTime: this.creationTimes[i],
      id: this.ids[i],
      type: this.types[i],
    };
  }

  public setNextBlockData(i: number, data: BlockData): void {
    // this.creationTimesNext[i] = data.creationTime;
    this.idsNext[i] = data.id;
    this.typesNext[i] = data.type;
  }

  public applyNexts(): void {
    // this.creationTimes.set(this.creationTimesNext);
    this.ids.set(this.idsNext);
    this.types.set(this.typesNext);
  }

  public resetNexts(): void {
    this.flags.fill(0);
    // this.creationTimesNext.set(this.creationTimes);
    this.idsNext.set(this.ids);
    this.typesNext.set(this.types);
  }

  public getIdOfBlock(index: number): number {
    return this.ids[index];
  }

  public setNextBlockId(index: number, id: number): void {
    this.idsNext[index] = id;
  }

  public getTypeOfBlock(index: number): number {
    return this.types[index];
  }

  /**
   * Don't mess with this unless you know what you're doing.
   */
  public getBlockTypes(): Uint8ClampedArray {
    return this.types;
  }

  /**
   * Don't mess with this unless you know what you're doing.
   */
  public getBlockIds(): Uint8ClampedArray {
    return this.ids;
  }

  public getNextBlockTypes(): Uint8ClampedArray {
    return this.typesNext;
  }

  public setNextTypeOfBlock(index: number, id: number): void {
    this.typesNext[index] = id;
  }

  // public getCreationTimeOfBlock(index: number): number {
  //   return this.creationTimes[index];
  // }

  // public setNextCreationTimeOfBlock(index: number, id: number): void {
  //   this.creationTimesNext[index] = id;
  // }

  public getFlagOfBlock(index: number, flag: UpdateFlags): boolean {
    return ((this.flags[index] >> flag) & 1) === 1;
  }

  public setBlockFlagOn(index: number, flag: UpdateFlags): void {
    this.flags[index] |= (1 << flag);
  }

  public setBlockFlagOff(index: number, flag: UpdateFlags): void {
    this.flags[index] &= ~(1 << flag);
  }

  /**
   * Run `func` on every block surrounding a given block (even if the neighboring block is in a different chunk)
   * @param x local x coord of center block
   * @param y local y coord of center block
   * @param useCenter whether or not to run `func` on the center block
   * @param func function to run on center block & neighboring blocks
   */
  // TODO figure out why this function leaves out a triangle 3 away from the corner of a chunk (regardless of chunk size?)
  public forEachNeighbor(x: number, y: number, func: (chunk: Chunk, index: number) => void, useCenter: boolean): void {
    for (let dx = x - 1; dx <= x + 1; dx++) {
      for (let dy = y - 1; dy <= y + 1; dy++) {
        if (useCenter || !(dx === x && dy === y)) {
          const c = this.getNearIndex(dx, dy);
          if (c !== null) {
            func(c[0], c[1]);
          }
        }
      }
    }
  }

  /**
   * Get the local coords and chunk of a block that is either within this chunk or within a neighboring chunk
   * @param i index of the local coordinate
   * @param x offset relative to the local block
   * @param y offset relative to the local block
   * @returns [chunk that contains block, index of block within that chunk]
   */
  public getNearIndexI(i: number, xo: number, yo: number): [Chunk, number] | null {
    return this.getNearIndex((i & CHUNK_MODMASK) + xo, (i >> CHUNK_BITSHIFT) + yo);
  }

  /**
   * Get the local coords and chunk of a block that is either within this chunk or within a neighboring chunk
   * @param x local x coord of a block in the chunk or in a neighboring chunk
   * @param y local y coord of a block in the chunk or in an neighboring chunk
   * @returns [chunk that contains block, index of block within that chunk]
   */
  public getNearIndex(x: number, y: number): [Chunk, number] | null {
    let cx;
    if (x < 0) {
      x = CHUNK_SIZEm1;
      cx = 0;
    } else if (x > CHUNK_SIZEm1) {
      x = 0;
      cx = 2;
    } else {
      cx = 1;
    }

    let cy;
    if (y < 0) {
      y = CHUNK_SIZEm1;
      cy = 0;
    } else if (y > CHUNK_SIZEm1) {
      y = 0;
      cy = 2;
    } else {
      cy = 1;
    }

    const chunk = this.neighbors[NEIGHBOR_OFFSETS[cx][cy]];
    return chunk === null ? null : [chunk, x + (y << CHUNK_BITSHIFT)];
  }
}

export abstract class WorldGenerator {
  public readonly world: World;
  private initialized = false;
  constructor(world: World) {
    this.world = world;
  }

  public runInit(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.init();
  }

  protected abstract init(): boolean;

  public abstract generate(world: World, x: number, y: number, chunk: Chunk): void;
}

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

export class World {
  private readonly chunkLoadRequests: Map<PointStr, number> = new Map();
  private readonly loadedChunks: Map<PointStr, Chunk> = new Map();
  private readonly worldGenGen: (world: World) => WorldGenerator;
  private worldGen?: WorldGenerator;
  private readonly blockTypes: Array<BlockType> = [];
  private readonly blockTypeMap: Map<string, number> = new Map();
  private time = 0;
  private rand = 1;
  private ticking = false;
  private initialized = false;
  private readonly targetFps: number;

  constructor(worldGenGen: (world: World) => WorldGenerator) {
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

    // apply/flush the pendingPending buffer
    for (const [, chunk] of this.loadedChunks) {
      if (!chunk.pendingTick) {
        continue;
      }

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