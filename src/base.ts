import NPoint from "./lib/NLib/npoint";
import { Color } from "./library";

export const CHUNK_SIZE = 64;
export const CHUNK_SIZEm1 = CHUNK_SIZE - 1;
export const CHUNK_SIZE2 = CHUNK_SIZE * CHUNK_SIZE;
export const CHUNK_SIZE2m1 = CHUNK_SIZE * (CHUNK_SIZE - 1);

export type ChunkCoord = NPoint;
export type GlobalCoord = NPoint;
export type LocalCoord = NPoint;

export type BlockId = number;

type Grid8 = Uint8Array;
type Grid16 = Uint16Array;
type Grid32 = Uint32Array;

type BlockShader = (world: World, chunk: Chunk, index: number) => Color;
export const shaderSolid: (color: Color) => BlockShader = (color: Color) => () => color

type TickBehavior = (world: World, chunk: Chunk, index: number) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const updateStatic: TickBehavior = () => { };

interface BlockTypeArgs {
  name: string,
  color: Color,
  shader?: BlockShader,
  tickBehavior?: TickBehavior,
}

export class BlockType {
  public readonly name: string;
  public readonly color: Color;
  public readonly shader: BlockShader;
  public readonly tickBehavior: TickBehavior;

  constructor({ name, color, shader, tickBehavior }: BlockTypeArgs) {
    this.name = name;
    this.color = color;
    this.shader = shader ?? shaderSolid(this.color);
    this.tickBehavior = tickBehavior ?? updateStatic;
  }
}

/**
 * block type that represents a missing block type
 */
export const bt_missing: BlockType = new BlockType({
  name: "missing",
  color: new Color(1, 0, 1),
});

enum UpdateFlags {
  PENDING_TICK = 0,
  RECEIVED_TICK = 1,
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
  new NPoint(-1, 0), new NPoint(-1, 1), NPoint.ZERO
]

const ANTIDIRS = [4, 5, 6, 7, 0, 1, 2, 3, 8];

/**
 * Chunk's fields are public because this is essentially a compound data structure.
 * Chunk shouldn't contain any real logic.
 */
export class Chunk {
  static NEIGHBOR_OFFSETS: Readonly<Array<Array<number>>> = Object.freeze([
    [Neighbors.DOWN_LEFT, Neighbors.LEFT, Neighbors.UP_LEFT],
    [Neighbors.DOWN, Neighbors.CENTER, Neighbors.UP],
    [Neighbors.DOWN_RIGHT, Neighbors.RIGHT, Neighbors.UP_RIGHT]
  ]);

  public pendingTick = false;
  // store by id, not coord
  public blocksPendingTick: Array<number> = [];
  public blocksPendingPendingTick: Array<number> = [];
  public readonly types: Grid16 = new Uint16Array(CHUNK_SIZE2);
  public readonly light: Grid32 = new Uint32Array(CHUNK_SIZE2);

  public neighbors: Array<Chunk | null> = Object.seal([null, null, null, null, null, null, null, null, this]);
  /**
   * 0: pending tick
   * 1: received tick
   * 2: locked
   * 3: pending redraw
   */
  public readonly flags: Grid8 = new Uint8Array(CHUNK_SIZE2);
  public readonly chunkCoord: NPoint;

  constructor(chunkCoord: NPoint, types: Grid16) {
    this.chunkCoord = chunkCoord;
    this.types = types;
  }

  public getFlag(index: number, flag: UpdateFlags): boolean {
    return (this.flags[index] >> flag & 1) === 1;
  }

  public setFlagOn(index: number, flag: UpdateFlags): void {
    this.flags[index] |= (1 << flag);
  }

  public setFlagOff(index: number, flag: UpdateFlags): void {
    this.flags[index] &= ~(1 << flag);
  }

  public static coordToIndex(x: number, y: number): number {
    return x * CHUNK_SIZE + y;
  }

  /**
   * Run `func` on every block surrounding a given block (even if the neighboring block is in a different chunk)
   * @param x local x coord of center block
   * @param y local y coord of center block
   * @param useCenter whether or not to run `func` on the center block
   * @param func function to run on center block & neighboring blocks
   */
  public forEachNeighbor(x: number, y: number, func: (chunk: Chunk, index: number) => void, useCenter: boolean): void {
    for (let dx = x - 1; dx <= dx + 1; dx++) {
      for (let dy = y - 1; dy <= dy + 1; dy++) {
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
      x = 0
      cx = 2;
    } else {
      cx = 1;
    }

    let cy;
    if (y < 0) {
      y += CHUNK_SIZE;
      cy = 0;
    } else if (y > CHUNK_SIZEm1) {
      y = 0;
      cy = 2;
    } else {
      cy = 1;
    }

    const chunk = this.neighbors[Chunk.NEIGHBOR_OFFSETS[cx][cy]];
    return chunk === null ? null : [chunk, Chunk.coordToIndex(x, y)];
  }
}

export abstract class WorldGenerator {
  public readonly world: World;
  private initialized = false;
  constructor(world: World) {
    this.world = world;
  }

  public runInit(): void{
    if(this.initialized){
      return; 
    }
    this.initialized = true;
    this.init();
  }

  protected abstract init(): boolean;

  public abstract generate(world: World, chunkCoord: ChunkCoord): Chunk;
}

/**
 * fill the world with bt_missing
 */
class MissingWorldGen extends WorldGenerator {
  public init(): boolean {
    return true;
  }
  public generate(world: World, chunkCoord: NPoint): Chunk {
    // block type 0 = bt_missing
    return new Chunk(chunkCoord, new Uint16Array(CHUNK_SIZE2));
  }

}

export class World {
  private readonly chunks: Map<NPoint, Chunk> = new Map();
  private readonly worldGenGen: (world: World) => WorldGenerator;
  private worldGen?: WorldGenerator;
  private readonly blockTypes: Array<BlockType> = [];
  private readonly blockTypeMap: Map<string, BlockId> = new Map();
  private time = 0;
  private initialized = false;

  constructor(worldGenGen: (world: World) => WorldGenerator) {
    this.addBlockType(bt_missing);
    this.worldGenGen = worldGenGen ?? ((world: World) => new MissingWorldGen(world));
  }

  public init(): boolean {
    this.worldGen = this.worldGenGen(this);
    this.initialized = true;
    return true;
  }

  public enqueueBlock(chunk: Chunk, i: number): void {
    chunk.pendingTick = true;
    if (!chunk.getFlag(i, UpdateFlags.PENDING_TICK)) {
      chunk.setFlagOn(i, UpdateFlags.PENDING_TICK);
      chunk.blocksPendingPendingTick.push(i);
    }
  }

  public enqueueNeighbors(chunk: Chunk, x: number, y: number, enqueueSelf = true): void {
    chunk.forEachNeighbor(x, y, this.enqueueBlock, enqueueSelf);
  }

  /**
   * Logic update for all pending blocks
   */
  public performGlobalTick(): void {
    if (!this.initialized) {
      throw "Attempted global tick before initialization";
    }

    // update pending chunks/blocks
    for (const [, chunk] of this.chunks) {
      if (!chunk.pendingTick) {
        continue;
      }

      // update pending blocks
      // loop in-place; this is not a problem because blocksPendingPendingTick is used for next tick
      for (const i of chunk.blocksPendingTick) {
        chunk.setFlagOff(i, UpdateFlags.PENDING_TICK);
        this.blockTypes[chunk.types[i]].tickBehavior(this, chunk, i);
      }
    }

    // apply/flush the pendingPending buffer
    for (const [, chunk] of this.chunks) {
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
    const blockId: BlockId = this.blockTypes.length
    this.blockTypeMap.set(type.name, blockId);
    this.blockTypes.push(type);
    return blockId;
  }

  public *getChunksInRange(origin: NPoint, dims: NPoint): Generator<Chunk> {
    const min = origin.divide1(CHUNK_SIZE).floor();
    const max = dims.divide1(CHUNK_SIZE).ceil();
    for (let x = min.x; x < max.x; x++) {
      for (let y = min.y; y < max.y; y++) {
        yield this.acquireChunk(new NPoint(x, y));
      }
    }
    return;
  }

  /**
   * impure; will create the chunk if it does not exist
   */
  public acquireChunk(coord: ChunkCoord): Chunk {
    if (!this.initialized) {
      throw "Attempted to acquire a chunk before initialization";
    }

    // check for existing chunk
    const existing: Chunk | undefined = this.chunks.get(coord);
    if (existing !== undefined) {
      return existing;
    }

    // create new chunk
    const newChunk = this.worldGen!.generate(this, coord);
    this.chunks.set(coord, newChunk);

    // assign neighbors
    for (let i = 0; i < 8; i++) {
      const neighbor = this.getChunk(coord.addp(DIRECTIONS[i]));
      if (neighbor !== undefined) {
        newChunk.neighbors[i] = neighbor;
        neighbor.neighbors[ANTIDIRS[i]] = newChunk;
      }
    }

    return newChunk;
  }

  public getChunk(coord: ChunkCoord): Chunk | undefined {
    return this.chunks.get(coord);
  }

  public getTime(): number {
    return this.time;
  }
}