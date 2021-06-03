import { CHUNK_BITSHIFT, CHUNK_SIZE2 } from "../matrix-common";
import getLightKernel from "../simulation/light-shader";

const kern = getLightKernel(CHUNK_BITSHIFT);
let light = new Float32Array(CHUNK_SIZE2);
const blocks = new Uint16Array(CHUNK_SIZE2);
const factors = [[255, 0, 0, 0.5, 0, 0, 0, 0, 1, 1, 1]];

light = <Float32Array>kern(light, blocks, factors);