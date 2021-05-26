import { Color } from "../library";
import { updateCascade, updateCrumble, updateFall, updateFlow } from "./block-behaviors";
import BlockType, { densityConstant, updateStatic } from "../simulation/matrix-blocktype";

export const standardBlockTypes: Array<BlockType> = [];

standardBlockTypes.push(new BlockType({
  name: "air",
  color: Color.fromHex("#e6f2ff"),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
}));


standardBlockTypes.push(new BlockType({
  name: "gravel",
  color: Color.fromHex("#5a5452"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCrumble(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "dirt",
  color: Color.fromHex("#75450d"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCascade(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "sand",
  color: Color.fromHex("#f0d422"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCascade(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "grass",
  color: Color.fromHex("#4eeb10"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateFall(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "stone",
  color: Color.fromHex("#787878"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "water",
  color: Color.fromHex("#408cff"),
  densityFunc: densityConstant(100),
  tickBehaviorGen: () => updateFlow(0.8, updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "lava",
  color: Color.fromHex("#408cff"),
  densityFunc: densityConstant(100),
  tickBehaviorGen: () => updateFlow(0.8, updateStatic),
}));