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
  color: Color.fromHex("#7E572E"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world: World): TickBehavior => {
    const waterMat = world.getBlockTypeIndex("water") ?? 0;
    const mudMat = world.getBlockTypeIndex("mud") ?? 0;

    return (world, chunk, i) => {
      // if water above, become wet sand
      const above = chunk.getNearIndexI(i, 0, 1);
      if (above !== null && above[0].getTypeOfBlock(above[1]) === waterMat) {
        world.tryMutateTypeOfBlock(chunk, i, mudMat);
      } else {
        updateCascade(updateStatic)(world, chunk, i);
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "sand",
  color: Color.fromHex("#f0d422"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world: World): TickBehavior => {
    const waterMat = world.getBlockTypeIndex("water") ?? 0;
    const wetSandMat = world.getBlockTypeIndex("wet_sand") ?? 0;

    return (world, chunk, i) => {
      // if water above, become wet sand
      const above = chunk.getNearIndexI(i, 0, 1);
      if (above !== null && above[0].getTypeOfBlock(above[1]) === waterMat) {
        world.tryMutateTypeOfBlock(chunk, i, wetSandMat);
      } else {
        updateCascade(updateStatic)(world, chunk, i);
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "wet_sand",
  color: Color.fromHex("#978157"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateFall(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "mud",
  color: Color.fromHex("#472f18"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateFall(updateStatic),
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
  color: Color.fromHex("#ff3500"),
  densityFunc: densityConstant(100),
  tickBehaviorGen: () => updateFlow(0.8, updateStatic),
}));