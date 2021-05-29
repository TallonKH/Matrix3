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
  min: Color.fromHex("#3ecb10"),
  max: Color.fromHex("#57cf02"),
  timeFactor1: 1,
});

standardBlockShaders.set("Moss", {
  min: Color.fromHex("#4b7006"),
  mid1: Color.fromHex("#799c11"),
  max: Color.fromHex("#cefb30"),
  timeFactor1: 1,
});

standardBlockShaders.set("Coater", {
  min: Color.fromHex("#490091"),
  mid1: Color.fromHex("#7227ab"),
  mid2: Color.fromHex("#9300bf"),
  max: Color.fromHex("#38b0b0"),
  mid2x: 0.98,
  timeFactor1: 1,
  timeScale1: 0.001,
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

standardBlockShaders.set("Barrier", {
  min: Color.fromHex("#d55"),
  max: Color.fromHex("#e55"),
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

standardBlockShaders.set("Seed", {
  min: Color.fromHex("#360"),
  max: Color.fromHex("#380"),
  timeFactor1: 1,
});

standardBlockShaders.set("MegaSeed", {
  min: Color.fromHex("#360"),
  max: Color.fromHex("#4f8"),
  timeFactor1: 1,
  timeScale1: 0.01,
});

standardBlockShaders.set("Plant", {
  min: Color.fromHex("#5a0"),
  max: Color.fromHex("#5b0"),
  timeFactor1: 1,
});

standardBlockShaders.set("Flower", {
  min: Color.fromHex("#fa0"),
  mid1: Color.fromHex("#ff0"),
  mid2: Color.fromHex("#8ff"),
  max: Color.fromHex("#faf"),
  mid1x: 0.33,
  mid2x: 0.66,
  timeFactor1: 1,
});

standardBlockShaders.set("Gray Goo", {
  min: Color.fromHex("#666699"),
  max: Color.fromHex("#777799"),
  timeFactor1: 0.3,
  timeOffsetFactor1: 0.0012,
  timeScale1: 0.001,
  timeFactor2: 0.7,
  timeOffsetFactor2: 0.1,
  timeScale2: 0.003,
});

standardBlockShaders.set("Virus", {
  min: Color.fromHex("#c066f9"),
  max: Color.fromHex("#f076ff"),
  timeFactor1: 0.3,
  timeOffsetFactor1: 0.0012,
  timeScale1: 0.001,
  timeFactor2: 0.7,
  timeOffsetFactor2: 0.1,
  timeScale2: 0.01,
});

standardBlockShaders.set("Cloner", {
  min: Color.fromHex("#0aa6a9"),
  max: Color.fromHex("#5ad6c9"),
  timeFactor1: 0.3,
  timeOffsetFactor1: 0.0012,
  timeScale1: 0.001,
  timeFactor2: 0.7,
  timeOffsetFactor2: 0.1,
  timeScale2: 0.003,
});

standardBlockShaders.set("Void", {
  min: Color.fromHex("#102"),
  mid1: Color.fromHex("#205"),
  max: Color.fromHex("#608"),
  mid1x: 0.99,
  timeFactor1: 0.9,
  timeOffsetFactor1: 0.002,
  timeScale1: 0.001,
  timeFactor2: 0.1,
  timeOffsetFactor2: 1,
  timeScale2: 0.01,
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
