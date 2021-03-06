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

  /**
   * values are from 0 to 1
   */
  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    Object.freeze(this);
  }

  public static fromHex(hex: string): Color {
    if (hex.charAt(0) === "#") {
      hex = hex.slice(1);
    }
    const l = hex.length;
    let r;
    let g;
    let b;

    if (l === 3 || l === 4) {
      r = hex.charAt(0) + hex.charAt(0);
      g = hex.charAt(1) + hex.charAt(1);
      b = hex.charAt(2) + hex.charAt(2);
    } else if (l === 6 || l === 8) {
      r = hex.charAt(0) + hex.charAt(1);
      g = hex.charAt(2) + hex.charAt(3);
      b = hex.charAt(4) + hex.charAt(5);
    } else {
      throw `invalid hex code "${hex}"`;
    }

    return new Color(parseInt(r, 16) / 255, parseInt(g, 16) / 255, parseInt(b, 16) / 255);
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

  public toHSL(): [number, number, number] {
    const r = this.r;
    const g = this.g;
    const b = this.b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max === min) {
      h = 0;
      s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h, s, l];
  }
}

export enum Neighbors {
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

export const mod = (n: number, m: number): number => {
  return ((n % m) + m) % m;
};

export const iterMap = function*<I, O>(iter: Iterable<I>, func: (item: I) => O): Iterable<O> {
  for (const item of iter) {
    yield func(item);
  }
};

export const iterFilter = function*<T>(iter: Iterable<T>, filter: (item: T) => boolean): Iterable<T> {
  for (const item of iter) {
    if (filter(item)) {
      yield item;
    }
  }
};

export const pixelCircle = (x: number, y: number, r: number, func: (x: number, y: number) => void): void => {
  const r2 = r * r;
  for (let yy = -r; yy < 0; yy++) {
    const xw = Math.floor(Math.sqrt(r2 - (yy * yy)));
    for (let xx = x - xw; xx < x + xw; xx++) {
      func(xx, y + yy);
      func(xx, y - yy);
    }
  }
  for (let xx = x - r; xx < x + r; xx++) {
    func(xx, y);
  }
};
