import { GPU, IKernelFunctionThis } from "gpu.js";
import { BlockShaderFactorList } from "./display";
const gpu = new GPU();

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function lerp(a: number, b: number, x: number) {
  return a + (b - a) * x;
}

// 1 int input, 1 uniform [0,1] float output
function rand1u1(x: number): number {
  return (Math.abs(Math.tan(x * 1398))) % 1;
}

// 3 int inputs, 1 uniform [0,1] float output
function rand3u1(x: number, y: number, z: number): number {
  return mod(Math.tan(Math.floor(x * 1398) ^ Math.floor(y * 413) + Math.floor(z * 3198)), 1);
}

// 3 int inputs, 1 3d unit vector output
function rand3vec3(x: number, y: number, z: number): [number, number, number] {
  const outZ = rand3u1(x, y, z);
  const coeff = Math.sqrt(1 - outZ * outZ);
  const theta = rand3u1(x + 1000, y, z) * 2 * Math.PI;

  return [
    Math.cos(theta) * coeff,
    Math.sin(theta) * coeff,
    outZ
  ];
}

function f3x2m1(n: [number, number, number]): [number, number, number] {
  return [
    n[0] * 2 - 1,
    n[1] * 2 - 1,
    n[2] * 2 - 1
  ];
}

// 3d dot product
function dot3(v1: [number, number, number], v2: [number, number, number]): number {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

function perlinCorner(xi: number, yi: number, zi: number, xf: number, yf: number, zf: number, xo: number, yo: number, zo: number): number {
  return 1.1547 * dot3(f3x2m1(rand3vec3(xi + xo, yi + yo, zi + zo)), [xo - xf, yo - yf, zo - zf]);
}

function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

/**
 * interpolate between 4 values: (x=0,y=a), (x=bt,y=b), (x=ct,y=c), (x=1,y=d)
 */
function lerp4(a: number, b: number, c: number, d: number, bt: number, ct: number, t: number): number {
  const ab = lerp(a, b, t / bt);
  const bc = lerp(b, c, (t - bt) / (ct - bt));
  const cd = lerp(c, d, (t - ct) / (1 - ct));
  return lerp(
    ab,
    lerp(bc, cd, Math.max(0, Math.sign(t - ct))),
    Math.max(0, Math.sign(t - bt)));
}

function perlin(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);

  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  return lerp(
    lerp(
      lerp(
        perlinCorner(xi, yi, zi, xf, yf, zf, 0, 0, 0),
        perlinCorner(xi, yi, zi, xf, yf, zf, 1, 0, 0),
        xf),
      lerp(
        perlinCorner(xi, yi, zi, xf, yf, zf, 0, 1, 0),
        perlinCorner(xi, yi, zi, xf, yf, zf, 1, 1, 0),
        xf),
      yf
    ),
    lerp(
      lerp(
        perlinCorner(xi, yi, zi, xf, yf, zf, 0, 0, 1),
        perlinCorner(xi, yi, zi, xf, yf, zf, 1, 0, 1),
        xf),
      lerp(
        perlinCorner(xi, yi, zi, xf, yf, zf, 0, 1, 1),
        perlinCorner(xi, yi, zi, xf, yf, zf, 1, 1, 1),
        xf),
      yf
    ),
    zf
  );
}

function kernelFunction(this: IKernelFunctionThis, args: [number, number, number, number, number], factors: BlockShaderFactorList[], blockData: Uint16Array): void {
  // const x = this.thread.x + (args[2] * args[0]);
  // const y = this.thread.y + (args[3] * args[0]);
  const i = this.thread.x + (this.thread.y << args[1]);
  const time = args[4];

  const type = blockData[i] & 0xff;
  const id = (blockData[i] & 0xff00) >> 8;

  const factor =
    (factors[type][14] * (Math.sin(((time * factors[type][15]) % (Math.PI * 2)) + id * factors[type][16]) + 1) / 2) +
    (factors[type][17] * (Math.sin(((time * factors[type][18]) % (Math.PI * 2)) + id * factors[type][19]) + 1) / 2);
  const mid1x = factors[type][12];
  const mid2x = factors[type][13];
  this.color(
    lerp4(
      factors[type][0],   // min r
      factors[type][1],  // mid1 r
      factors[type][2],  // mid2 r
      factors[type][3],   // max r
      mid1x, mid2x, factor),
    lerp4(
      factors[type][4],   // min g
      factors[type][5],  // mid1 g
      factors[type][6],  // mid2 g
      factors[type][7],   // max g
      mid1x, mid2x, factor),
    lerp4(
      factors[type][8],   // min b
      factors[type][9],  // mid1 b
      factors[type][10],  // mid2 b
      factors[type][11],   // max b
      mid1x, mid2x, factor),
    1
  );
}

export default function getShaderKernel() {
  return gpu.createKernel<typeof kernelFunction>(kernelFunction)
    .setFunctions([
      lerp,
      lerp4,
      // f3x2m1, rand1u1, rand3u1, rand3vec3, dot3, perlinCorner, perlin,
    ]).setGraphical(true);
}