import { BlockShaderFactorMap } from "../client/display";
import { Color } from "../library";

export const standardBlockShaders: Map<string, BlockShaderFactorMap> = new Map();

standardBlockShaders.set("Air", {
  min: Color.fromHex("#e6f2ff"),
  max: Color.fromHex("#e6f2ff"),
});

standardBlockShaders.set("Gravel", {
  min: Color.fromHex("#5a5452"),
  max: Color.fromHex("#787878"),
  timeFactor1: 1,
});

standardBlockShaders.set("Grass", {
  min: Color.fromHex("#57cf02"),
  max: Color.fromHex("#4eeb10"),
  timeFactor1: 1,
});

standardBlockShaders.set("Dirt", {
  min: Color.fromHex("#6D4F30"),
  max: Color.fromHex("#836242"),
  timeFactor1: 1,
});

standardBlockShaders.set("Mud", {
  min: Color.fromHex("#472f18"),
  max: Color.fromHex("#5c3d1f"),
  timeFactor1: 1,
});

standardBlockShaders.set("Sand", {
  min: Color.fromHex("#f0d422"),
  mid2: Color.fromHex("#ffe645"),
  max: Color.fromHex("#fff0c0"),
  mid2x: 0.995,
  timeFactor1: 1,
});

standardBlockShaders.set("Wet Sand", {
  min: Color.fromHex("#978157"),
  max: Color.fromHex("#A89560"),
  timeFactor1: 1,
});

standardBlockShaders.set("Stone", {
  min: Color.fromHex("#787878"),
  max: Color.fromHex("#8c8c8c"),
  timeFactor1: 1,
});

standardBlockShaders.set("Water", {
  min: Color.fromHex("#3b78f7"),
  max: Color.fromHex("#408cff"),
  timeFactor1: 1,
  timeScale1: 0.001,
});

standardBlockShaders.set("Acid", {
  min: Color.fromHex("#26d15f"),
  max: Color.fromHex("#3deb54"),
  timeFactor1: 1,
  timeScale1: 0.001,
});

standardBlockShaders.set("Steam", {
  min: Color.fromHex("#d0d0d0"),
  max: Color.fromHex("#e8e8e8"),
  timeFactor1: 1,
  timeScale1: 0.01,
});

standardBlockShaders.set("Glass", {
  min: Color.fromHex("#e9f3f5"),
  max: Color.fromHex("#f5fdff"),
  timeFactor1: 1,
});


standardBlockShaders.set("Lava", {
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
