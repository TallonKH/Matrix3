import { BlockShaderFactorMap } from "../client/display";
import { Color } from "../library";

export const standardBlockShaders: Map<string, BlockShaderFactorMap> = new Map();

standardBlockShaders.set("air", {
  min: Color.fromHex("#e6f2ff"),
  max: Color.fromHex("#e6f2ff"),
});

standardBlockShaders.set("gravel", {
  min: Color.fromHex("#5a5452"),
  max: Color.fromHex("#787878"),
  timeFactor1: 1,
});

standardBlockShaders.set("grass", {
  min: Color.fromHex("#57cf02"),
  max: Color.fromHex("#4eeb10"),
  timeFactor1: 1,
});

standardBlockShaders.set("dirt", {
  min: Color.fromHex("#75450d"),
  max: Color.fromHex("#824f14"),
  timeFactor1: 1,
});

standardBlockShaders.set("sand", {
  min: Color.fromHex("#f0d422"),
  max: Color.fromHex("#ffe645"),
  timeFactor1: 1,
});

standardBlockShaders.set("stone", {
  min: Color.fromHex("#787878"),
  max: Color.fromHex("#8c8c8c"),
  timeFactor1: 1,
});

standardBlockShaders.set("water", {
  min: Color.fromHex("#3b78f7"),
  // mid2: Color.fromHex("#408cff"),
  // max: Color.fromHex("#86afff"),
  max: Color.fromHex("#408cff"),
  timeFactor1: 1,
  timeScale1: 0.001,
  // mid2x: 0.95,
  // timeFactor1: 0.7,
  // timeOffsetFactor1: 0.05,
  // timeScale1: 0.001,
  // timeFactor2: 0.3,
  // timeOffsetFactor2: 1,
  // timeScale2: 0.0001,
});

standardBlockShaders.set("lava", {
  min: Color.fromHex("#e11010"),
  mid1x: 0.1,
  mid1: Color.fromHex("#ff3500"),
  mid2x: 0.95,
  mid2: Color.fromHex("#ffb21c"),
  max: Color.fromHex("#efeba1"),
  timeFactor1: 0.7,
  timeOffsetFactor1: 0.0012,
  timeScale1: 0.0002,
  timeFactor2: 0.3,
  timeOffsetFactor2: 0.1,
  timeScale2: 0.001,
});
