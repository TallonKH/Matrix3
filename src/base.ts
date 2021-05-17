import { NPoint, PointStr, ZERO } from "./lib/NLib/npoint";
import { Color, mixRands } from "./library";
// import {GPU} from "gpu.js";
// various common derivations of chunk size
export const CHUNK_BITSHIFT = 2;
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

export type BlockId = number;

type Grid8 = Uint8Array;
type Grid16 = Uint16Array;
type Grid32 = Uint32Array;


type BlockShader = (world: World, chunk: Chunk, i: number, x: number, y: number) => Color;
export const shaderSolid: (color: Color) => BlockShader
  = (color: Color) =>
    () => color;
export const shaderLerp: (colorA: Color, colorB: Color) => BlockShader
  = (colorA: Color, colorB: Color) =>
    (_, chunk, i) => Color.lerp(colorA, colorB, chunk.getBlockId(i) / 255);

type TickBehavior = (world: World, chunk: Chunk, index: number) => void;
// eslint-disable-next-line no-empty-function
export const updateStatic: TickBehavior = () => { };

interface BlockTypeArgs {
  name: string,
  color: Color,
  shader?: BlockShader,
  tickBehaviorGen?: (world: World) => TickBehavior,
}

export class BlockType {
  public readonly name: string;
  public readonly color: Color;
  public readonly shader: BlockShader;
  public readonly tickBehaviorGen?: (world: World) => TickBehavior;
  private tickBehavior: TickBehavior;
  private initialized = false;

  constructor({ name, color, shader, tickBehaviorGen }: BlockTypeArgs) {
    this.name = name;
    this.color = color;
    this.shader = shader ?? shaderSolid(this.color);
    this.tickBehaviorGen = tickBehaviorGen;
    this.tickBehavior = updateStatic;
  }

  public doTick: TickBehavior = (world: World, chunk: Chunk, index: number) => this.tickBehavior(world, chunk, index);

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
  // RECEIVED_TICK = 1,
  LOCKED = 2,
  PENDING_REDRAW = 3,
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
   * 3: ~~pending redraw~~
   */
  private readonly flags: Grid8 = new Uint8Array(CHUNK_SIZE2);
  private readonly flagsNext: Grid8 = new Uint8Array(CHUNK_SIZE2);
  private readonly creationTimes: Grid16 = new Uint16Array(CHUNK_SIZE2); // wraps around
  private readonly creationTimesNext: Grid16 = new Uint16Array(CHUNK_SIZE2);
  private readonly ids: Grid8 = new Uint8Array(CHUNK_SIZE2); // ids are not unique; just random
  private readonly idsNext: Grid8 = new Uint8Array(CHUNK_SIZE2);
  private readonly types: Grid16 = new Uint16Array(CHUNK_SIZE2);
  private readonly typesNext: Grid16 = new Uint16Array(CHUNK_SIZE2);

  public readonly x: number;
  public readonly y: number;
  public readonly coord: NPoint;

  constructor(x: number, y: number, types: Grid16) {
    this.x = x;
    this.y = y;
    this.coord = new NPoint(x, y);
    this.types = types;

    // populate ids with randoms
    let rand = mixRands(x, y);
    for (let i = 0; i < CHUNK_SIZE2; i++) {
      rand = mixRands(rand, i);
      this.ids[i] = rand;
    }
    rand = 0;
  }

  public applyNexts(): void {
    this.creationTimes.set(this.creationTimesNext);
    this.ids.set(this.idsNext);
    this.types.set(this.typesNext);
  }

  public resetNexts(): void {
    this.flags.fill(0);
    this.creationTimesNext.set(this.creationTimes);
    this.idsNext.set(this.ids);
    this.typesNext.set(this.types);
  }

  public getBlockId(index: number): number {
    return this.ids[index];
  }

  public setNextBlockId(index: number, id: number): void {
    this.idsNext[index] = id;
  }

  public getBlockType(index: number): number {
    return this.types[index];
  }

  // TODO this is temporary
  public getBlockTypes(): Uint16Array {
    return this.types;
  }

  // TODO this is temporary
  public getNextBlockTypes(): Uint16Array {
    return this.typesNext;
  }

  public setNextBlockType(index: number, id: number): void {
    this.typesNext[index] = id;
  }

  public getBlockCreationTime(index: number): number {
    return this.creationTimes[index];
  }

  public setNextBlockCreationTime(index: number, id: number): void {
    this.creationTimesNext[index] = id;
  }

  public getFlag(index: number, flag: UpdateFlags): boolean {
    return ((this.flags[index] >> flag) & 1) === 1;
  }

  public setFlagOn(index: number, flag: UpdateFlags): void {
    this.flags[index] |= (1 << flag);
  }

  public setFlagOff(index: number, flag: UpdateFlags): void {
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
   * @param x local x coord of a block in the chunk or in a neighboring chunk
   * @param y local y coord of a block in the chunk or in an neighboring chunk
   * @returns [chunk that contains block, index of block within that chunk]
   */
  public getNearIndex(x: number, y: number): [Chunk, number] | null {
    let cx;
    if (x < 0) {
      x += CHUNK_SIZE;
      cx = 0;
    } else if (x > CHUNK_SIZEm1) {
      x -= CHUNK_SIZE;
      cx = 2;
    } else {
      cx = 1;
    }

    let cy;
    if (y < 0) {
      y += CHUNK_SIZE;
      cy = 0;
    } else if (y > CHUNK_SIZEm1) {
      y -= CHUNK_SIZE;
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

  public abstract generate(world: World, x: number, y: number): Chunk;
}

/**
 * fill the world with bt_missing
 */
class MissingWorldGen extends WorldGenerator {
  public init(): boolean {
    return true;
  }
  public generate(world: World, x: number, y: number): Chunk {
    // block type 0 = bt_missing
    return new Chunk(x, y, new Uint16Array(CHUNK_SIZE2));
  }

}

export class World {
  private readonly chunkLoadRequests: Map<PointStr, number> = new Map();
  private readonly loadedChunks: Map<PointStr, Chunk> = new Map();
  private readonly worldGenGen: (world: World) => WorldGenerator;
  private worldGen?: WorldGenerator;
  private readonly blockTypes: Array<BlockType> = [];
  private readonly blockTypeMap: Map<string, BlockId> = new Map();
  private time = 0;
  private rand = 1;
  private ticking = false;
  private initialized = false;

  private redrawListenerCounter = 0;
  private redrawListeners: Map<number, (chunk: Chunk, i: number) => void> = new Map();

  constructor(worldGenGen: (world: World) => WorldGenerator) {
    this.addBlockType(bt_missing);
    this.worldGenGen = worldGenGen ?? ((world: World) => new MissingWorldGen(world));
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

  public startTickLoop(): void {
    if (this.ticking) {
      throw "already ticking!";
    }
    this.ticking = true;

    window.setInterval(() => {
      this.performGlobalTick();
    }, ~~(1000 / 5));
  }

  public setBlockTypeNew(chunk: Chunk, i: number, typeId: number, force = false): void {
    if (force || !chunk.getFlag(i, UpdateFlags.LOCKED)) {
      // reset creation time
      chunk.setNextBlockCreationTime(i, this.time);
      // reset id
      this.rand = mixRands(this.rand, i + this.time);
      chunk.setNextBlockId(i, mixRands(this.rand, i) & 0b11111111);
      // actually set type
      this.setBlockTypeMutate(chunk, i, typeId, true);
    }
  }

  public setBlockTypeMutate(chunk: Chunk, i: number, typeId: number, force = false): void {
    if(force || !chunk.getFlag(i, UpdateFlags.LOCKED)){
      // set type (for the next iteration)
      chunk.setNextBlockType(i, typeId);
      chunk.setFlagOn(i, UpdateFlags.LOCKED);
      
      this.requestBlockRedraw(chunk, i);
      this.queueNeighbors(chunk, i & CHUNK_MODMASK, i >> CHUNK_BITSHIFT, true);
    }
  }

  public queueBlock(chunk: Chunk, i: number): void {
    if (!chunk.getFlag(i, UpdateFlags.PENDING_TICK)) {
      chunk.pendingTick = true;
      chunk.setFlagOn(i, UpdateFlags.PENDING_TICK);
      chunk.blocksPendingPendingTick.push(i);
    }
  }

  public queueNeighbors(chunk: Chunk, x: number, y: number, enqueueSelf = true): void {
    chunk.forEachNeighbor(x, y, this.queueBlock, enqueueSelf);
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

  public registerRedrawListener(func: (chunk: Chunk, i: number) => void): number {
    this.redrawListenerCounter++;
    this.redrawListeners.set(this.redrawListenerCounter, func);
    return this.redrawListenerCounter;
  }

  public unregisterRedrawListener(id: number): void {
    this.redrawListeners.delete(id);
  }

  public requestBlockRedraw(chunk: Chunk, i: number): void {
    this.redrawListeners.forEach(f => f(chunk, i));
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
    for (const [, chunk] of this.loadedChunks) {
      if (!chunk.pendingTick) {
        continue;
      }
      for (const i of chunk.blocksPendingTick) {
        this.blockTypes[chunk.getBlockType(i)].doTick(this, chunk, i);
      }
    }
    for (const [, chunk] of this.loadedChunks) {
      if (!chunk.pendingTick) {
        continue;
      }
      chunk.applyNexts();
    }
    // console.log("tick done");

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

  public getBlockTypeIndex(name: string): number | undefined {
    return this.blockTypeMap.get(name);
  }

  public getBlockType(index: number): BlockType {
    return this.blockTypes[index];
  }

  public addBlockType(type: BlockType): undefined | BlockId {
    if (this.blockTypeMap.has(type.name)) {
      return undefined;
    }
    const blockId: BlockId = this.blockTypes.length;
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newChunk = this.worldGen!.generate(this, x, y);
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