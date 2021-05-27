import { Color } from "../library";
import { updateCascade, updateCrumble, updateFall, updateFlow } from "./block-behaviors";
import BlockType, { densityConstant, TickBehavior, updateStatic } from "../simulation/matrix-blocktype";
import World from "../simulation/matrix-world";

export const standardBlockTypes: Array<BlockType> = [];

const cornerCoords = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const adjacentCoords = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const neighboringCoords = Array.from([...cornerCoords, ...adjacentCoords]);

standardBlockTypes.push(new BlockType({
  name: "Air",
  color: Color.fromHex("#e6f2ff"),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
  acidResistance: 1,
}));


standardBlockTypes.push(new BlockType({
  name: "Gravel",
  color: Color.fromHex("#5a5452"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: () => updateCrumble(updateStatic),
}));

standardBlockTypes.push(new BlockType({
  name: "Dirt",
  color: Color.fromHex("#7E572E"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;
    const mudMat = world_init.getBlockTypeIndex("Mud") ?? 0;

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
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;
    const mudMat = world_init.getBlockTypeIndex("Mud") ?? 0;
    const grassMat = world_init.getBlockTypeIndex("Grass") ?? 0;

    return (world, chunk, i) => {
      // if has both air and soil and grass, become grass
      let hasSoil = false;
      let hasAir = false;
      let hasGrass = false;
      for(const offset of adjacentCoords){
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if(adj === null){
          continue;
        }
        const adjMat = adj[0].getTypeOfBlock(adj[1]);
        if(adjMat === airMat){
          hasAir = true;
          continue;
        }
        if(adjMat === dirtMat || adjMat === mudMat){
          hasSoil = true;
          continue;
        }
        if(adjMat === grassMat){
          hasGrass = true;
          continue;
        }
      }

      // check corners for grass
      if(!hasGrass){
        for(const offset of cornerCoords){
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if(adj === null){
            continue;
          }
          if(adj[0].getTypeOfBlock(adj[1]) === grassMat){
            hasGrass = true;
            break;
          }
        }
      }
      if(hasGrass && hasAir && hasSoil){
        world.tryMutateTypeOfBlock(chunk, i, grassMat);
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Sand",
  color: Color.fromHex("#f0d422"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const lavaMat = world_init.getBlockTypeIndex("Lava") ?? 0;
    const glassMat = world_init.getBlockTypeIndex("Glass") ?? 0;
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;
    const wetSandMat = world_init.getBlockTypeIndex("Wet Sand") ?? 0;

    return (world, chunk, i) => {
      // if touching lava, become glass
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj !== null && adj[0].getTypeOfBlock(adj[1]) === lavaMat) {
          world.tryMutateTypeOfBlock(chunk, i, glassMat);
          return;
        }
      }

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
  name: "Glass",
  color: Color.fromHex("#e9f3f5"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
  acidResistance: 1,
}));

standardBlockTypes.push(new BlockType({
  name: "Wet Sand",
  color: Color.fromHex("#978157"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const lavaMat = world_init.getBlockTypeIndex("Lava") ?? 0;
    const sandMat = world_init.getBlockTypeIndex("Sand") ?? 0;

    return (world, chunk, i) => {
      // if touching lava, become sand
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj !== null && adj[0].getTypeOfBlock(adj[1]) === lavaMat) {
          world.tryMutateTypeOfBlock(chunk, i, sandMat);
          return;
        }
      }

      updateFall(updateStatic)(world, chunk, i);
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Mud",
  color: Color.fromHex("#472f18"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const lavaMat = world_init.getBlockTypeIndex("Lava") ?? 0;
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;

    return (world, chunk, i) => {
      // if touching lava, become dirt
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj !== null && adj[0].getTypeOfBlock(adj[1]) === lavaMat) {
          world.tryMutateTypeOfBlock(chunk, i, dirtMat);
          return;
        }
      }

      updateFall(updateStatic)(world, chunk, i);
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Grass",
  color: Color.fromHex("#4eeb10"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: () => updateFall(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;
    const mudMat = world_init.getBlockTypeIndex("Mud") ?? 0;
    const grassMat = world_init.getBlockTypeIndex("Grass") ?? 0;

    return (world, chunk, i) => {
      // if doesn't have both air and soil, become dirt
      let hasSoil = false;
      let hasAir = false;
      for(const offset of adjacentCoords){
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if(adj === null){
          continue;
        }
        const adjMat = adj[0].getTypeOfBlock(adj[1]);
        if(adjMat === airMat){
          hasAir = true;
          continue;
        }
        if(adjMat === dirtMat || adjMat === mudMat){
          hasSoil = true;
          continue;
        }
      }

      if(!hasAir || !hasSoil){
        world.tryMutateTypeOfBlock(chunk, i, dirtMat);
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Stone",
  color: Color.fromHex("#787878"),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
  acidResistance: 0.7,
}));

standardBlockTypes.push(new BlockType({
  name: "Barrier",
  color: Color.fromHex("#e55"),
  densityFunc: densityConstant(250),
  tickBehaviorGen: () => updateStatic,
  acidResistance: 1,
  invincible: true,
}));

standardBlockTypes.push(new BlockType({
  name: "Water",
  color: Color.fromHex("#408cff"),
  densityFunc: densityConstant(100),
  tickBehaviorGen: (world: World): TickBehavior => {
    const lavaMat = world.getBlockTypeIndex("Lava") ?? 0;
    const steamMat = world.getBlockTypeIndex("Steam") ?? 0;
    const stoneMat = world.getBlockTypeIndex("Stone") ?? 0;

    return (world, chunk, i) => {
      // if touching lava, become steam or make the lava stone
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj !== null && adj[0].getTypeOfBlock(adj[1]) === lavaMat) {
          if (world.getRandomFloat() > 0.7) {
            world.tryMutateTypeOfBlock(adj[0], adj[1], stoneMat);
          } else {
            world.tryMutateTypeOfBlock(chunk, i, steamMat);
            return;
          }
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
  randomTickBehaviorGen: (world_init) => {
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;
    return (world, chunk, i) => {
      if (world.getRandomFloat() > 0.99) {
        world.tryMutateTypeOfBlock(chunk, i, waterMat);
      }
    };
  }
}));

// TODO figure out why acid & lava can't penetrate upper/lower chunk borders
standardBlockTypes.push(new BlockType({
  name: "Acid",
  color: Color.fromHex("#26d15f"),
  densityFunc: densityConstant(120),
  acidResistance: 1,
  tickBehaviorGen: (world_init) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    return (world, chunk, i) => {
      for (const offset of [[0, -1], [-1, 0], [1, 0]]) {
        if (world.getRandomFloat() > 0.8) {
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if (adj === null) {
            continue;
          }

          // try destroy adjacent block
          const adjType = world.getBlockType(adj[0].getTypeOfBlock(adj[1]));
          if ((!adjType.invincible) && world.getRandomFloat() > adjType.acidResistance) {
            world.trySetTypeOfBlock(adj[0], adj[1], airMat);
            // try destroy self
            if (world.getRandomFloat() > 0.7) {
              world.trySetTypeOfBlock(chunk, i, airMat);
              return;
            }
          }
        }
      }
      updateFlow(0.8, updateStatic)(world, chunk, i);
    };
  },
  randomTickBehaviorGen: () => (world, chunk, i) => world.queueBlock(chunk, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Lava",
  color: Color.fromHex("#ff3500"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: () => updateFlow(0.02, updateStatic),
  randomTickBehaviorGen: (world_init: World) => {
    const lavaMat = world_init.getBlockTypeIndex("Lava") ?? 0;
    const stoneMat = world_init.getBlockTypeIndex("Stone") ?? 0;
    const gravelMat = world_init.getBlockTypeIndex("Gravel") ?? 0;

    return (world, chunk, i) => {
      if (world.getRandomFloat() > 0.8) {
        // if not surrounded by lava, make self stone
        let allLava = true;
        for (const offset of adjacentCoords) {
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if (adj !== null && adj[0].getTypeOfBlock(adj[1]) !== lavaMat) {
            allLava = false;
            break;
          }
        }
        if (!allLava) {
          world.tryMutateTypeOfBlock(chunk, i, stoneMat);
        }
      } else {
        // if touching stone, make it lava
        for (const offset of adjacentCoords) {
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if (adj === null) {
            continue;
          }
          const adjMat = adj[0].getTypeOfBlock(adj[1]);
          if (adjMat === stoneMat || adjMat === gravelMat) {
            if (world.getRandomFloat() > 0.7) {
              world.tryMutateTypeOfBlock(adj[0], adj[1], lavaMat);
            }
          }
        }
      }
    };
  }
}));

standardBlockTypes.push(new BlockType({
  name: "Gray Goo",
  color: Color.fromHex("#666699"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const gooMat = world_init.getBlockTypeIndex("Gray Goo") ?? 0;

    return (world, chunk, i) => {
      // convert surrounding blocks
      for (const offset of adjacentCoords) {
        if (world.getRandomFloat() > 0.6) {
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if (adj === null) {
            continue;
          }

          const adjMat = adj[0].getTypeOfBlock(adj[1]);
          if (adjMat !== airMat && adjMat !== gooMat && !world.getBlockType(adjMat).invincible) {
            world.tryMutateTypeOfBlock(adj[0], adj[1], gooMat);
          }
        }
      }

      updateCrumble(updateStatic)(world, chunk, i);
    };
  },
  randomTickBehaviorGen: () => (world, chunk, i) => world.queueBlock(chunk, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Virus",
  color: Color.fromHex("#c066f9"),
  acidResistance: 0,
  densityFunc: densityConstant(50),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const virusMat = world_init.getBlockTypeIndex("Virus") ?? 0;

    return (world, chunk, i) => {
      const nears = [];
      if (world.getRandomFloat() > 0.95) {
        world.trySetTypeOfBlock(chunk, i, airMat);
        return;
      }

      // destroy self if not connected to anything
      let adjacentSurfaces = 0;
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj === null) {
          continue;
        }

        nears.push(adj);

        const adjMat = adj[0].getTypeOfBlock(adj[1]);
        if (adjMat !== airMat && adjMat !== virusMat) {
          adjacentSurfaces++;
        }
      }

      if (adjacentSurfaces <= 1) {
        if (world.getRandomFloat() > 0.95) {
          world.trySetTypeOfBlock(chunk, i, airMat);
        } else {
          updateCascade(updateStatic)(world, chunk, i);
        }
        return;
      }

      // convert surrounding blocks
      for (const adj of nears) {
        const adjMat = adj[0].getTypeOfBlock(adj[1]);
        if (adjMat !== virusMat && !world.getBlockType(adjMat).invincible) {
          if (world.getRandomFloat() > 0.6) {
            world.tryMutateTypeOfBlock(adj[0], adj[1], virusMat);
          }
        }
      }
    };
  },
  randomTickBehaviorGen: () => (world, chunk, i) => world.queueBlock(chunk, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Cloner",
  color: Color.fromHex("#0aa6a9"),
  acidResistance: 1,
  invincible: true,
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const cloneMat = world_init.getBlockTypeIndex("Cloner") ?? 0;

    return (world, chunk, i) => {
      // get surrounding empty spaces and cloneable blocks; also kill other clones
      const emptySpots = [];
      const cloneableTypes = [];
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj === null) {
          continue;
        }

        const adjMat = adj[0].getTypeOfBlock(adj[1]);
        if (adjMat === airMat) {
          emptySpots.push(adj);
        } else if (adjMat === cloneMat) {
          world.trySetTypeOfBlock(adj[0], adj[1], airMat);
        } else if (!world.getBlockType(adjMat).invincible) {
          cloneableTypes.push(adjMat);
        }
      }

      if (cloneableTypes.length > 0) {
        for (const adj of emptySpots) {
          world.trySetTypeOfBlock(adj[0], adj[1], cloneableTypes[~~(world.getRandomFloat() * cloneableTypes.length)]);
        }
      }
    };
  },
  randomTickBehaviorGen: () => (world, chunk, i) => world.queueBlock(chunk, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Void",
  color: Color.fromHex("#103"),
  acidResistance: 1,
  invincible: true,
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;

    return (world, chunk, i) => {
      // get surrounding empty spaces and cloneable blocks; also kill other clones
      for (const offset of adjacentCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj === null) {
          continue;
        }

        const adjMat = adj[0].getTypeOfBlock(adj[1]);
        if (adjMat !== airMat && !world.getBlockType(adjMat).invincible) {
          world.trySetTypeOfBlock(adj[0], adj[1], airMat);
        }
      }
    };
  },
}));