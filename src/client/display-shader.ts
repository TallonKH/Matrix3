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

function kernelFunction(this: IKernelFunctionThis, args: [number, number, number, number, number], factors: BlockShaderFactorList[], types: Uint16Array, ids: Uint8Array): void {
  // const x = this.thread.x + (args[2] * args[0]);
  // const y = this.thread.y + (args[3] * args[0]);
  const i = this.thread.x + (this.thread.y << args[1]);
  const time = args[4];

  const type = types[i];

  const factor =
    (factors[type][6] * (ids[i] / 255)) +
    (factors[type][7] * (Math.sin(time * factors[type][8] + ids[i] * factors[type][9]) + 1) / 2);

  // noise version
  // const factor =
  //   (factors[type][6] * (ids[i] / 255)) +
  //   (factors[type][7] * (perlin(
  //     factors[type][8] * x,
  //     factors[type][9] * y,
  //     factors[type][10] * time) + 1) / 2) + 
  //   (factors[type][11] * (perlin(
  //     factors[type][12] * x,
  //     factors[type][13] * y,
  //     factors[type][14] * time) + 1) / 2);

  this.color(
    lerp(factors[type][0], factors[type][3], factor),
    lerp(factors[type][1], factors[type][4], factor),
    lerp(factors[type][2], factors[type][5], factor),
    1
  );
}

export default function getShaderKernel() {
  return gpu.createKernel<typeof kernelFunction>(kernelFunction)
    .setFunctions([
      lerp,
      // f3x2m1, rand1u1, rand3u1, rand3vec3, dot3, perlinCorner, perlin,
    ]).setGraphical(true);
}