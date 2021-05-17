import { BlockShader } from "./base";
import { Color } from "./library";

export const shaderLerp: (colorA: Color, colorB: Color) => BlockShader
  = (colorA: Color, colorB: Color) =>
    (_, chunk, i) => Color.lerp(colorA, colorB, chunk.getIdOfBlock(i) / 255);
    