import { IKernelFunctionThis } from "gpu.js";
import { lerp } from "../lib/NLib/nmath";
import { gpu } from "../matrix-common";
import { BlockLightFactorList } from "./matrix-chunk";

interface IConstants {
  chunk_bitshift: number;
  chunk_size: number;
  chunk_modmask: number;
}

type This = IKernelFunctionThis & {
  constants: IConstants;
}

/**
 * returns 1 if the index is within [0,size), and 0 otherwise
 */
function withinChunk(x: number, size: number): number {
  return Math.ceil((x + 1) / size) & 1;
}

function adjColor(selfLight: number, edgeLight: number, factor: number): [number, number, number] {
  return [
    ((lerp(edgeLight, selfLight, factor)) & 0xff),
    ((lerp(edgeLight, selfLight, factor) >> 8) & 0xff),
    ((lerp(edgeLight, selfLight, factor) >> 16) & 0xff),
  ];
}

function lightFunction(this: This, light: Float32Array, edgeLight: Float32Array, blockdata: Uint16Array, factors: BlockLightFactorList[]): number {
  // why is >>0 necessary? no fucking clue. Math.floor doesn't fix it. ~~ doesn't fix it either.
  const chunk_size = this.constants.chunk_size >> 0;
  const chunk_modmask = this.constants.chunk_modmask >> 0;
  const chunk_bitshift = this.constants.chunk_bitshift >> 0;

  const i = this.thread.x;
  const x = i & chunk_modmask;
  const y = i >> chunk_bitshift;

  // light above
  const adjUp = adjColor(
    light[x + (((y + 1) & chunk_modmask) << chunk_bitshift)],
    edgeLight[x],
    withinChunk(y + 1, chunk_size)
  );

  // light below
  const adjDown = adjColor(
    light[x + (((y - 1) & chunk_modmask) << chunk_bitshift)],
    edgeLight[chunk_size + x],
    withinChunk(y - 1, chunk_size)
  );

  // light left
  const adjLeft = adjColor(
    light[((x - 1) & chunk_modmask) + (y << chunk_bitshift)],
    edgeLight[chunk_size + chunk_size + y],
    withinChunk(x - 1, chunk_size)
  );

  // light right
  const adjRight = adjColor(
    light[((x + 1) & chunk_modmask) + (y << chunk_bitshift)],
    edgeLight[chunk_size + chunk_size + chunk_size + y],
    withinChunk(x + 1, chunk_size)
  );

  const blocktype = Math.floor(blockdata[i] & 0xff);
  return (
    (Math.floor(Math.max(
      factors[blocktype][0],
      factors[blocktype][3] * Math.max(adjUp[0], Math.max(adjDown[0], Math.max(adjLeft[0], adjRight[0])))))) |
    (Math.floor(Math.max(
      factors[blocktype][1],
      factors[blocktype][4] * Math.max(adjUp[1], Math.max(adjDown[1], Math.max(adjLeft[1], adjRight[1])))) << 8)) |
    (Math.floor(Math.max(
      factors[blocktype][2],
      factors[blocktype][5] * Math.max(adjUp[2], Math.max(adjDown[2], Math.max(adjLeft[2], adjRight[2]))))) << 16)
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function getLightKernel(chunk_bitshift: number) {
  const chunksize = 1 << chunk_bitshift;

  return gpu.createKernel(lightFunction).setFunctions([
    withinChunk,
    adjColor,
  ]).setOutput([chunksize * chunksize])
    .setConstants<IConstants>({
      chunk_bitshift: chunk_bitshift,
      chunk_modmask: chunksize - 1,
      chunk_size: chunksize,
    });
}