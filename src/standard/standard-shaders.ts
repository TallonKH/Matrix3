import { BlockShaderFactorMap } from "../client/display";
import { Color } from "../library";

export const standardBlockShaders: Map<string, BlockShaderFactorMap> = new Map();

standardBlockShaders.set("Sky", {
  min: Color.fromHex("#d2e9ff"),
  max: Color.fromHex("#d2e9ff"),
});

standardBlockShaders.set("Air", {
  min: Color.fromHex("#d2e9ff"),
  max: Color.fromHex("#d2e9ff"),
});

standardBlockShaders.set("Gravel", {
  min: Color.fromHex("#5a5452"),
  max: Color.fromHex("#787878"),
  timeFactor1: 1,
});

standardBlockShaders.set("Pitch", {
  min: Color.fromHex("#0a011c"),
  max: Color.fromHex("#0b031e"),
  timeFactor1: 1,
});

standardBlockShaders.set("Labyrium", {
  min: Color.fromHex("#ffbb45"),
  max: Color.fromHex("#ffe066"),
  minBrightness: 0.8,
  timeFactor1: 0.7,
  timeOffsetFactor1: 0,
  timeScale1: 0.0005,
  timeFactor2: 0.3,
  timeOffsetFactor2: 0.03,
  timeScale2: 0.0004,
});

standardBlockShaders.set("Lattium", {
  min: Color.fromHex("#a4f759"),
  max: Color.fromHex("#d6ff9c"),
  minBrightness: 0.8,
  timeFactor1: 0.7,
  timeOffsetFactor1: 0,
  timeScale1: 0.0005,
  timeFactor2: 0.3,
  timeOffsetFactor2: 0.03,
  timeScale2: 0.0004,
});

standardBlockShaders.set("Compartium", {
  min: Color.fromHex("#70d9ff"),
  max: Color.fromHex("#a8fff3"),
  minBrightness: 0.8,
  timeFactor1: 0.7,
  timeOffsetFactor1: 0,
  timeScale1: 0.0005,
  timeFactor2: 0.3,
  timeOffsetFactor2: 0.03,
  timeScale2: 0.0004,
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
  minBrightness: 1,
});

standardBlockShaders.set("Water", {
  min: Color.fromHex("#3b78f7"),
  max: Color.fromHex("#408cff"),
  timeFactor1: 1,
  timeScale1: 0.001,
});

standardBlockShaders.set("Sinker", {
  min: Color.fromHex("#6d7d65"),
  mid2: Color.fromHex("#769970"),
  max: Color.fromHex("#a0d19d"),
  mid2x: 0.98,
  timeFactor1: 0.95,
  timeFactor2: 0.05,
  timeScale2: 0.002,
  timeOffsetFactor2: 0.02,
});

standardBlockShaders.set("Firefly", {
  min: Color.fromHex("#f5cd3d"),
  mid2: Color.fromHex("#ffe252"),
  max: Color.fromHex("#fff8cf"),
  minBrightness: 0.9,
  mid2x: 0.98,
  timeFactor1: 0.95,
  timeFactor2: 0.05,
  timeScale2: 0.004,
  timeOffsetFactor2: 0.02,
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
  minBrightness: 0.6,
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
  minBrightness: 1,
});

standardBlockShaders.set("Scaffold", {
  min: Color.fromHex("#d4b133"),
  max: Color.fromHex("#e4c143"),
  timeFactor1: 1,
});

standardBlockShaders.set("Steam", {
  min: Color.fromHex("#d0d0d0"),
  max: Color.fromHex("#e8e8e8"),
  timeFactor1: 1,
  timeScale1: 0.01,
});

standardBlockShaders.set("Fire", {
  min: Color.fromHex("#ff3612"),
  mid1: Color.fromHex("#ff5e14"),
  mid2: Color.fromHex("#ffad14"),
  max: Color.fromHex("#fffc47"),
  mid1x: 0.2,
  mid2x: 0.8,
  minBrightness: 1,
  timeFactor1: 1,
  timeOffsetFactor1: 1,
  timeScale1: 0.004,
});

standardBlockShaders.set("Smoke", {
  min: Color.fromHex("#444"),
  mid1: Color.fromHex("#555"),
  mid2: Color.fromHex("#666"),
  max: Color.fromHex("#777"),
  mid1x: 0.2,
  mid2x: 0.8,
  timeFactor1: 1,
  timeOffsetFactor1: 1,
  timeScale1: 0.001,
});

standardBlockShaders.set("Ash", {
  min: Color.fromHex("#333"),
  max: Color.fromHex("#444"),
  timeFactor1: 1,
});

standardBlockShaders.set("Glass", {
  min: Color.fromHex("#e9f3f5"),
  max: Color.fromHex("#f5fdff"),
  timeFactor1: 1,
});

standardBlockShaders.set("Darkstone", {
  min: Color.fromHex("#112"),
  mid2: Color.fromHex("#151525"),
  max: Color.fromHex("#2b1a26"),
  mid2x: 0.95,
  timeFactor1: 1,
  minBrightness: 1,
});

standardBlockShaders.set("Lamp", {
  min: Color.fromHex("#ffffdf"),
  max: Color.fromHex("#ffffff"),
  timeFactor1: 1,
  timeScale1: 0.001,
});


standardBlockShaders.set("Sunstone", {
  min: Color.fromHex("#ffdf5f"),
  mid1: Color.fromHex("#ffef9f"),
  max: Color.fromHex("#ffffcf"),
  timeFactor1: 1,
  mid1x: 0.01,
  timeScale1: 0.0002,
});

standardBlockShaders.set("Hotstone", {
  min: Color.fromHex("#8a4b45"),
  mid2: Color.fromHex("#915d59"),
  max: Color.fromHex("#d95448"),
  mid2x: 0.98,
  timeFactor1: 0.95,
  timeFactor2: 0.05,
  timeScale2: 0.002,
  timeOffsetFactor2: 0.02,
});

standardBlockShaders.set("Coldstone", {
  min: Color.fromHex("#456d8a"),
  mid2: Color.fromHex("#607d91"),
  max: Color.fromHex("#60b7d6"),
  mid2x: 0.98,
  timeFactor1: 0.95,
  timeFactor2: 0.05,
  timeScale2: 0.002,
  timeOffsetFactor2: 0.02,
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
