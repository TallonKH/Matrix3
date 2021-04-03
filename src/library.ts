import { lerp } from "./lib/NLib/nmath";

export function randify(a: number): number {
  // the logic here is arbitrary; it just takes an input and mixes it into something unpredictable
  return (((a + 1.8) * (a ^ 1988637647)) ^ (a << (a % 31))) >>> 0;
}

export function mixRands(a: number, b: number): number {
  // the logic here is arbitrary; it just takes in 2 inputs and combines them into something unpredictable
  return ((a + b) ^ (b << ((a + 1) * b % 31))) >>> 0;
}

export function toProp(a: number): number {
  return a / 4294967296;
}

export function getBit(num: number, shift: number): boolean{
  return ((num >> shift) & 1) === 1;
}

export function setBit(num: number, shift: number, bit: boolean): number{
  return (num & ~(1<<shift)) | ((bit ? 1 : 0)<<shift);
}

export class Color {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = b;
    this.b = b;
    Object.freeze(this);
  }

  toString(): string {
    return "(" +
      this.r.toFixed(3) + ", " +
      this.g.toFixed(3) + ", " +
      this.b.toFixed(3) + ")"
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
      Color.componentToHex(this.b)
  }

  operate(f: (c: number) => number) {
    return new Color(f(this.r), f(this.g), f(this.b));
  }

  static boperate(a: Color, b: Color, f: (a: number, b: number) => number) {
    return new Color(f(a.r, b.r), f(a.g, b.g), f(a.b, b.b));
  }

  static lerp(a: Color, b: Color, factor: number): Color {
    return this.boperate(a, b, (ca, cb) => lerp(ca, cb, factor));
  }
}