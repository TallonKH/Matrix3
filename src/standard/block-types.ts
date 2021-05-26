import { Color } from "../library";
import { updateCascade, updateCrumble, updateFall, updateFlow } from "./block-behaviors";
import BlockType, { densityConstant, TickBehavior, updateStatic } from "../simulation/matrix-blocktype";
import World from "../simulation/matrix-world";

export const standardBlockTypes: Array<BlockType> = [];

standardBlockTypes.push(new BlockType({
  name: "Air",
  color: Color.fromHex("#e6f2ff"),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
}));


standardBlockTypes.push(new BlockType({
  name: "Gravel",
  color: Color.fromHex("#5a5452"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCrumble(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "Dirt",
  color: Color.fromHex("#7E572E"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world: World): TickBehavior => {
    const waterMat = world.getBlockTypeIndex("Water") ?? 0;
    const mudMat = world.getBlockTypeIndex("Mud") ?? 0;

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
  name: "Sand",
  color: Color.fromHex("#f0d422"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world: World): TickBehavior => {
    const waterMat = world.getBlockTypeIndex("Water") ?? 0;
    const wetSandMat = world.getBlockTypeIndex("Wet Sand") ?? 0;

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
  name: "Wet Sand",
  color: Color.fromHex("#978157"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateFall(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "Mud",
  color: Color.fromHex("#472f18"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateFall(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "Grass",
  color: Color.fromHex("#4eeb10"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world: World): TickBehavior => {
    const airMat = world.getBlockTypeIndex("Air") ?? 0;
    const dirtMat = world.getBlockTypeIndex("Dirt") ?? 0;

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
  name: "Stone",
  color: Color.fromHex("#787878"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "Water",
  color: Color.fromHex("#408cff"),
  densityFunc: densityConstant(100),
  tickBehaviorGen: (world: World): TickBehavior => {
    const lavaMat = world.getBlockTypeIndex("Lava") ?? 0;
    const steamMat = world.getBlockTypeIndex("Steam") ?? 0;

    return (world, chunk, i) => {
      // if touching lava, become steam
      for(const offset of [[0,-1], [0,1], [-1,0], [1,0]]){
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj !== null && adj[0].getTypeOfBlock(adj[1]) === lavaMat) {
          world.tryMutateTypeOfBlock(chunk, i, steamMat);
          return;
        }
      }

      updateFlow(0.8, updateStatic)(world, chunk, i);
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Steam",
  color: Color.fromHex("#e3e3e3"),
  densityFunc: densityConstant(5),
  tickBehaviorGen: () => updateFlow(0, updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "Lava",
  color: Color.fromHex("#ff3500"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: () => updateFlow(0.02, updateStatic),
}));