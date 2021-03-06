import { IKernelFunctionThis } from "gpu.js";
import { lerp } from "../lib/NLib/nmath";
import { gpu } from "../matrix-common";
import { BlockShaderFactorList } from "./display";

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

function shaderFunction(this: IKernelFunctionThis, args: [number, number, number, number, number], factors: BlockShaderFactorList[], blockData: Uint16Array, light: Float32Array): void {
  const i = this.thread.x + (this.thread.y << args[1]);
  const time = ~~args[4];

  const type = blockData[i] & 0xff;
  const id = (blockData[i] & 0xff00) >> 8;

  const factor =
    ((factors[type][14] * (Math.sin(((factors[type][15] * time) % 6.2831853) + id * factors[type][16]) + 1) / 2) +
      (factors[type][17] * (Math.sin(((factors[type][18] * time) % 6.2831853) + id * factors[type][19]) + 1) / 2));
  const mid1x = factors[type][12];
  const mid2x = factors[type][13];

  const blocklight = light[i];
  const minBright = factors[type][20];

  // this.color(
  //   ((blocklight) & 0xff) / 255,
  //   ((blocklight >> 8) & 0xff) / 255,
  //   ((blocklight >> 16) & 0xff) / 255,
  //   1
  // );

  // const blockTemp = ((blocklight >> 24) & 0xff) / 255;
  // this.color(
  //   lerp(0, 1, blockTemp),
  //   lerp(1, 0, blockTemp),
  //   lerp(1, 0, blockTemp),
  //   1
  // );

  this.color((
    lerp4(
      factors[type][0],   // min r
      factors[type][1],   // mid1 r
      factors[type][2],   // mid2 r
      factors[type][3],   // max r
      mid1x, mid2x, factor
    ) * Math.max(minBright, ((blocklight) & 0xff) / 255)
  ), (
    lerp4(
      factors[type][4],   // min g
      factors[type][5],   // mid1 g
      factors[type][6],   // mid2 g
      factors[type][7],   // max g
      mid1x, mid2x, factor
    ) * Math.max(minBright, ((blocklight >> 8) & 0xff) / 255)
  ), (
    lerp4(
      factors[type][8],   // min b
      factors[type][9],   // mid1 b
      factors[type][10],  // mid2 b
      factors[type][11],  // max b
      mid1x, mid2x, factor
    ) * Math.max(minBright, ((blocklight >> 16) & 0xff) / 255)
  ),
    1
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function getShaderKernel() {
  return gpu.createKernel<typeof shaderFunction>(shaderFunction)
    .setFunctions([
      lerp4,
    ]).setGraphical(true);
}