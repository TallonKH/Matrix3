import { Color } from "../library";
import { updateCrumble, updateFlow } from "./block-behaviors";
import BlockType, { densityConstant, updateStatic } from "../simulation/matrix-blocktype";

export const standardBlockTypes : Array<BlockType> = [];

standardBlockTypes.push(new BlockType({
  name: "air",
  color: new Color(0.9, 0.95, 1),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
}));


standardBlockTypes.push(new BlockType({
  name: "cobble",
  color: new Color(0.4, 0.4, 0.4),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCrumble(updateStatic),
}));


standardBlockTypes.push(new BlockType({
  name: "stone",
  color: new Color(0.5, 0.5, 0.5),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "water",
  color: new Color(0.4, 0.4, 0.4),
  densityFunc: densityConstant(100),
  tickBehaviorGen: () => updateFlow(0.8, updateStatic),
}));