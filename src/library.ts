import { lerp } from "./lib/NLib/nmath";
import { NPoint, ZERO } from "./lib/NLib/npoint";

export function randify(a: number): number {
  // the logic here is arbitrary; it just takes an input and mixes it into something unpredictable
  return (((a + 1.8) * (a ^ 1988637647)) ^ (a << (a % 31))) >>> 0;
}

export function mixRands(a: number, b: number): number {
  // the logic here is arbitrary; it just takes in 2 inputs and combines them into something unpredictable
  return ((a * 19285 + ((b << 24) ^ (a + 1132) ^ b) * 32672) ^ (b << ((a + 1) >> (b & 0b1111))) ^ 98764321234) >>> 0;
}

export function toProp(a: number): number {
  return a / 4294967296;
}

export function getBit(num: number, shift: number): boolean {
  return ((num >> shift) & 1) === 1;
}

export function setBit(num: number, shift: number, bit: boolean): number {
  return (num & ~(1 << shift)) | ((bit ? 1 : 0) << shift);
}

export function shuffleArray<T>(randFunc: () => number, array: Array<T>): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = ~~(randFunc() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
export class Color {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    Object.freeze(this);
  }

  toString(): string {
    return "(" +
      this.r.toFixed(3) + ", " +
      this.g.toFixed(3) + ", " +
      this.b.toFixed(3) + ")";
  }

  static componentToHex(c: number): string {
    // hex
    const hex = Math.round(c * 255).toString(16);
    // leading 0
    return hex.length === 1 ? "0" + hex : hex;
  }

  toHex(): string {
    return "#" +
      Color.componentToHex(this.r) +
      Color.componentToHex(this.g) +
      Color.componentToHex(this.b);
  }

  operate(f: (c: number) => number): Color {
    return new Color(f(this.r), f(this.g), f(this.b));
  }

  static boperate(a: Color, b: Color, f: (a: number, b: number) => number): Color {
    return new Color(f(a.r, b.r), f(a.g, b.g), f(a.b, b.b));
  }

  static lerp(a: Color, b: Color, factor: number): Color {
    return this.boperate(a, b, (ca, cb) => lerp(ca, cb, factor));
  }
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

export const DIRECTIONS = [
  new NPoint(0, 1), new NPoint(1, 1), new NPoint(1, 0),
  new NPoint(1, -1), new NPoint(0, -1), new NPoint(-1, -1),
  new NPoint(-1, 0), new NPoint(-1, 1), ZERO
];

export const ANTIDIRS = [4, 5, 6, 7, 0, 1, 2, 3, 8];

export const NEIGHBOR_OFFSETS: Readonly<Array<Array<number>>> = Object.freeze([
  [Neighbors.DOWN_LEFT, Neighbors.LEFT, Neighbors.UP_LEFT],
  [Neighbors.DOWN, Neighbors.CENTER, Neighbors.UP],
  [Neighbors.DOWN_RIGHT, Neighbors.RIGHT, Neighbors.UP_RIGHT]
]);