import { Color } from "../library";
import { updateCascade, updateCrumble, updateFall, updateFlow } from "./block-behaviors";
import BlockType, { densityConstant, TickBehavior, updateStatic } from "../simulation/matrix-blocktype";
import World from "../simulation/matrix-world";

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
  tickBehaviorGen: (world: World): TickBehavior => {
    const airMat = world.getBlockTypeIndex("air") ?? 0;
    const dirtMat = world.getBlockTypeIndex("dirt") ?? 0;

    return (world, chunk, i) => {
      // if no dirt below, become dirt
      const below = chunk.getNearIndexI(i, 0, -1);
      if (below !== null && below[0].getTypeOfBlock(below[1]) !== dirtMat) {
        world.tryMutateTypeOfBlock(chunk, i, dirtMat);
        return;
      }
      // if no air above, become dirt
      const above = chunk.getNearIndexI(i, 0, 1);
      if (above !== null && above[0].getTypeOfBlock(above[1]) !== airMat) {
        world.tryMutateTypeOfBlock(chunk, i, dirtMat);
        return;
      }
    };
  },
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