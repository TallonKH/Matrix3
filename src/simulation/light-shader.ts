import { GPU, IKernelFunctionThis } from "gpu.js";
import { BlockLightFactorList } from "./matrix-chunk";

const gpu = new GPU();

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

function getUpLight(x: number, y: number, size: number, bitshift: number, light: Float32Array): [number, number, number, number] {
  const i = (x + (y << bitshift)) & (size * size - 1);
  const fac = withinChunk(x, size) * withinChunk(y, size);

  return [
    fac * ((light[i]) & 0xff),
    fac * ((light[i] >> 8) & 0xff),
    fac * ((light[i] >> 16) & 0xff),
    fac * ((light[i] >> 24) & 0xff),
  ];
}

function lerp(a: number, b: number, x: number) {
  return a + (b - a) * x;
}

function adjColor(selfLight: number, edgeLight: number, factor: number): [number, number, number] {
  return [
    ((lerp(edgeLight, selfLight, factor)) & 0xff),
    ((lerp(edgeLight, selfLight, factor) >> 8) & 0xff),
    ((lerp(edgeLight, selfLight, factor) >> 16) & 0xff),
  ];
}

function lightFunction(this: This, light: Float32Array, edgeLight: Float32Array, blockdata: Uint16Array, factors: BlockLightFactorList[]): number {
  const chunk_size = this.constants.chunk_size;
  const chunk_modmask = this.constants.chunk_modmask;
  const chunk_bitshift = this.constants.chunk_bitshift;

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

  const blocktype = blockdata[i] & 0xff;

  const col = [
    Math.floor(
      Math.max(
        factors[blocktype][0],
        // Math.max(
        //   factors[blocktype][0], // emission
        //   factors[blocktype][8] * selfSun // sun diffusion
        // ),
        factors[blocktype][3] * Math.max(adjUp[0], Math.max(adjDown[0], Math.max(adjLeft[0], adjRight[0]))))),
    Math.floor(
      Math.max(
        factors[blocktype][1],
        // Math.max(
        //   factors[blocktype][1], // emission
        //   factors[blocktype][9] * selfSun // sun diffusion
        // ),
        factors[blocktype][4] * Math.max(adjUp[1], Math.max(adjDown[1], Math.max(adjLeft[1], adjRight[1]))))),
    Math.floor(
      Math.max(
        factors[blocktype][2],
        // Math.max(
        //   factors[blocktype][2], // emission
        //   factors[blocktype][10] * selfSun // sun diffusion
        // ),
        factors[blocktype][5] * Math.max(adjUp[2], Math.max(adjDown[2], Math.max(adjLeft[2], adjRight[2]))))),
    // Math.floor(Math.max(factors[blocktype][6], factors[blocktype][7] * adjUp[3])),
  ];

  return col[0] | (col[1] << 8) | (col[2] << 16);// | (col[3] << 24);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function getLightKernel(chunk_bitshift: number) {
  const chunksize = 1 << chunk_bitshift;

  return gpu.createKernel(lightFunction).setFunctions([
    withinChunk,
    adjColor,
    lerp,
  ]).setOutput([chunksize * chunksize])
    .setConstants<IConstants>({
      chunk_bitshift: chunk_bitshift,
      chunk_modmask: chunksize - 1,
      chunk_size: chunksize,
    });
}