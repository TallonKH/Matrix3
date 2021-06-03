import { NPoint } from "../lib/NLib/npoint";
import { NEIGHBOR_OFFSETS } from "../library";
import { CHUNK_BITSHIFT, CHUNK_MODMASK, CHUNK_SIZE2, CHUNK_SIZEm1 } from "../matrix-common";

// export type BlockData = {
//   // creationTime: number,
//   id: number,
//   type: number 
// };
/**
 * 8 (>>0) type
 * 8 (>>8) id
 * 8 (>>16) temp
 * 8 (>>24) custom data
//  * 8 (>>32) sunlight
//  * 8 (>>40) color r
//  * 8 (>>48) color g
//  * 8 (>>56) color b
 */
export type BlockData = number;

export enum UpdateFlags {
  PENDING_TICK = 0,
  LOCKED = 1,
}

export type BlockLightFactorList = [
  number, number, number, // 0,1,2 emission r,g,b
  number, number, number, // 3,4,5 opacity r,g,b (how much surrounding blocks receive from it)
];

/**
 * Chunk's fields are public because this is essentially a compound data structure.
 * Chunk shouldn't contain any real logic.
 * Variables are typically public, unless changes should only be done in specific manners
 */
export default class Chunk {
  public pendingTick = false;
  // store by id, not coord
  public blocksPendingTick: Array<number> = [];
  public blocksPendingPendingTick: Array<number> = [];
  public pendingClientChanges: Array<[number, number]> = [];

  public lighting: Float32Array;

  public neighbors: Array<Chunk | null> = Object.seal([null, null, null, null, null, null, null, null, this]);
  /**
   * 0: pending tick
   * 1: locked
   */
  private readonly flags: Uint8Array;

  /**
   * whether or not this chunk should be saved to storage next time it's unloaded
   */
  public needsSaving = false;

  // private readonly creationTimes: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2); // wraps around
  // private readonly creationTimesNext: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  // private readonly ids: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2); // ids are not unique; just random
  // private readonly idsNext: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  // private readonly temps: Uint8Array = new Uint8Array(CHUNK_SIZE2); // ids are not unique; just random
  // private readonly tempsNext: Uint8Array = new Uint8Array(CHUNK_SIZE2);
  // private readonly types: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  // private readonly typesNext: Uint8ClampedArray = new Uint8ClampedArray(CHUNK_SIZE2);
  private readonly blockData;
  private readonly blockDataNext = new Uint16Array(CHUNK_SIZE2);

  public readonly coord: NPoint;

  constructor(x: number, y: number, blockData?: Uint16Array, flags?: Uint8Array, lighting? : Float32Array) {
    this.coord = new NPoint(x, y);
    this.blockData = blockData ?? new Uint16Array(CHUNK_SIZE2);
    this.flags = flags ?? new Uint8Array(CHUNK_SIZE2);
    this.lighting = lighting ?? new Float32Array(CHUNK_SIZE2);
    if (flags !== undefined) {
      for (let i = 0; i < CHUNK_SIZE2; i++) {
        if (this.flags[i] & 1) {
          this.blocksPendingTick.push(i);
        }
      }
      this.pendingTick = true;
    }
  }

  public getBlockData(): Uint16Array {
    return this.blockData;
  }

  public getDataOfBlock(i: number): BlockData {
    return this.blockData[i];
    // return thi
    // return {
    //   // creationTime: this.creationTimes[i],
    //   id: this.ids[i],
    //   type: this.types[i],
    // };
  }

  public setNextBlockData(i: number, data: BlockData): void {
    // this.creationTimesNext[i] = data.creationTime;
    // this.idsNext[i] = data.id;
    // this.typesNext[i] = data.type;
    this.blockDataNext[i] = data;
  }

  public applyNexts(): void {
    // this.creationTimes.set(this.creationTimesNext);
    // this.ids.set(this.idsNext);
    // this.types.set(this.typesNext);
    this.blockData.set(this.blockDataNext);
  }

  public resetNexts(): void {
    this.flags.fill(0);
    // this.creationTimesNext.set(this.creationTimes);
    // this.idsNext.set(this.ids);
    // this.typesNext.set(this.types);
    this.blockDataNext.set(this.blockData);
  }

  public getIdOfBlock(index: number): number {
    // return this.ids[index];
    return (this.blockData[index] & 0xff00) >> 8;
  }

  public setNextBlockId(index: number, id: number): void {
    // this.idsNext[index] = id;
    this.blockDataNext[index] = (this.blockData[index] & 0x00ff) | (id << 8);
  }

  public getTypeIndexOfBlock(index: number): number {
    // return this.types[index];
    return this.blockData[index] & 0x00ff;
  }

  public setNextTypeOfBlock(index: number, typeId: number): void {
    // this.typesNext[index] = id;
    this.blockDataNext[index] = (this.blockData[index] & 0xff00) | typeId;
  }

  public setCurrentTypeOfBlock(index: number, typeId: number): void {
    // this.typesNext[index] = id;
    this.blockData[index] = (this.blockData[index] & 0xff00) | typeId;
  }

  public setCurrentIdOfBlock(index: number, id: number): void {
    // this.typesNext[index] = id;
    this.blockData[index] = (this.blockData[index] & 0x00ff) | (id << 8);
  }

  // /**
  //  * Don't mess with this unless you know what you're doing.
  //  */
  // public getBlockTypes(): Uint8ClampedArray {
  //   return this.types;
  // }

  // /**
  //  * Don't mess with this unless you know what you're doing.
  //  */
  // public getBlockIds(): Uint8ClampedArray {
  //   return this.ids;
  // }

  // public getNextBlockTypes(): Uint8ClampedArray {
  //   return this.typesNext;
  // }

  // public getCreationTimeOfBlock(index: number): number {
  //   return this.creationTimes[index];
  // }

  // public setNextCreationTimeOfBlock(index: number, id: number): void {
  //   this.creationTimesNext[index] = id;
  // }

  public getBlockFlags(): Uint8Array {
    return this.flags;
  }

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