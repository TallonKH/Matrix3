import { BlockShaderFactorMap } from "../client/display";
import { Color } from "../library";

const shaderData: Map<string, BlockShaderFactorMap> = new Map();

shaderData.set("air", {
  min: new Color(0.9, 0.95, 1),
  max: new Color(0.9, 0.95, 1),
});
shaderData.set("gravel", {
  min: new Color(0.35, 0.32, 0.32),
  max: new Color(0.47, 0.47, 0.47),
});
shaderData.set("stone", {
  min: new Color(0.46, 0.46, 0.46),
  max: new Color(0.55, 0.55, 0.55),
  randFactor: 1,
});
shaderData.set("water", {
  min: new Color(0.23, 0.47, 0.97),
  max: new Color(0.25, 0.55, 1),
  randFactor: 0.5,
  timeFactor: 0.5,
  timeOffsetFactor: 1,
  timeScale: 0.05,
});