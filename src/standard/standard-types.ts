import { Color } from "../library";
import { allTagsPresent, anyTypesHaveAllTags, getAdjacentTypes, getRelatives, updateCascade, updateCrumble, updateFall, updateFlow } from "./standard-behaviors";
import BlockType, { densityConstant, TickBehavior, updateStatic } from "../simulation/matrix-blocktype";
import World from "../simulation/matrix-world";

export const standardBlockTypes: Array<BlockType> = [];

standardBlockTypes.push(new BlockType({
  name: "Air",
  color: Color.fromHex("#e6f2ff"),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
  numbers: [["acid-resistance", 1]],
  tags: ["replaceable", "breathable"],
}));


standardBlockTypes.push(new BlockType({
  name: "Gravel",
  color: Color.fromHex("#5a5452"),
  densityFunc: densityConstant(150),
  tickBehaviorGen: () => updateCrumble(updateStatic),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "falling", "crumbling", "stone-based", "earth", "meltable"],
}));

standardBlockTypes.push(new BlockType({
  name: "Dirt",
  color: Color.fromHex("#7E572E"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "falling", "cascading", "soil", "earth"],
  tickBehaviorGen: () => updateCascade(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const mudMat = world_init.getBlockTypeIndex("Mud") ?? 0;

    return (w, c, i) => {
      // become mud if hydrated
      if (anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["hydrating"])) {
        w.tryMutateTypeOfBlock(c, i, mudMat);
        return;
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Sand",
  color: Color.fromHex("#f0d422"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.3]],
  tags: ["solid", "unstable", "falling", "cascading", "sandy", "earth", "meltable"],
  tickBehaviorGen: () => updateCascade(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const glassMat = world_init.getBlockTypeIndex("Glass") ?? 0;
    const wetSandMat = world_init.getBlockTypeIndex("Wet Sand") ?? 0;

    return (w, c, i) => {
      const adjTypes = getAdjacentTypes(w, c, i);
      // become glass if melted
      // TODO molten glass
      if (anyTypesHaveAllTags(adjTypes, ["melter"])) {
        w.tryMutateTypeOfBlock(c, i, glassMat);
        return;
      }
      // become wet sand if hydrated
      if (anyTypesHaveAllTags(adjTypes, ["hydrating"])) {
        w.tryMutateTypeOfBlock(c, i, wetSandMat);
        return;
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Glass",
  color: Color.fromHex("#e9f3f5"),
  densityFunc: densityConstant(200),
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable"],
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "Wet Sand",
  color: Color.fromHex("#978157"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.2]],
  tags: ["solid", "unstable", "falling", "sandy", "earth", "wet"],
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const sandMat = world_init.getBlockTypeIndex("Sand") ?? 0;

    return (w, c, i) => {
      // dry out when heated
      if (anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["hot"])) {
        w.tryMutateTypeOfBlock(c, i, sandMat);
        return;
      }

      updateFall(updateStatic)(w, c, i);
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Mud",
  color: Color.fromHex("#472f18"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "falling", "soil", "earth", "wet"],
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;

    return (w, c, i) => {
      // dry out when heated
      if (anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["hot"])) {
        w.tryMutateTypeOfBlock(c, i, dirtMat);
        return;
      }

      updateFall(updateStatic)(w, c, i);
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Grass",
  color: Color.fromHex("#4eeb10"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "falling", "earth", "plant", "organic"],
  tickBehaviorGen: () => updateFall(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;
    const grassMat = world_init.getBlockTypeIndex("Grass") ?? 0;

    return (w, c, i) => {
      // if doesn't have both air and soil, become dirt
      if (!allTagsPresent(getAdjacentTypes(w, c, i), ["breathable", "soil"])) {
        w.tryMutateTypeOfBlock(c, i, dirtMat);
        return;
      }

      // TODO try to convert other dirt into grass
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Stone",
  color: Color.fromHex("#787878"),
  densityFunc: densityConstant(200),
  numbers: [["acid-resistance", 0.7]],
  tags: ["solid", "stable", "earth", "stone-based", "meltable"],
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "Barrier",
  color: Color.fromHex("#e55"),
  densityFunc: densityConstant(250),
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable", "invincible"],
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "Water",
  color: Color.fromHex("#408cff"),
  densityFunc: densityConstant(100),
  numbers: [["acid-resistance", 0.1]],
  tags: ["fluid", "liquid", "falling", "unstable", "wet", "water-based", "hydrating", "boilable"],
  tickBehaviorGen: (world_init) => {
    const steamMat = world_init.getBlockTypeIndex("Steam") ?? 0;

    return (w, c, i) => {
      // if heated a lot, instantly become steam
      if (anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["boiler"])) {
        w.tryMutateTypeOfBlock(c, i, steamMat);
        return;
      }
      updateFlow(0.8, updateStatic)(w, c, i);
    };
  },
  randomTickBehaviorGen: (world_init) => {
    const steamMat = world_init.getBlockTypeIndex("Steam") ?? 0;

    return (w, c, i) => {
      // if heated a bit, sometimes become steam
      if (anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["hot"])) {
        if (w.getRandomFloat() > 0.95) {
          w.tryMutateTypeOfBlock(c, i, steamMat);
        }
      }
    };
  }
}));

standardBlockTypes.push(new BlockType({
  name: "Steam",
  color: Color.fromHex("#e3e3e3"),
  densityFunc: densityConstant(5),
  numbers: [["acid-resistance", 0.1]],
  tags: ["fluid", "gas", "rising", "unstable", "wet", "water-based", "hot", "boiling"],
  tickBehaviorGen: (world_init) => {
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;

    return (w, c, i) => {
      // if cooled, instantly become water
      if (anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["cold"])) {
        w.tryMutateTypeOfBlock(c, i, waterMat);
        return;
      }

      updateFlow(1, updateStatic)(w, c, i);
    };
  },
  randomTickBehaviorGen: (world_init) => {
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;

    return (w, c, i) => {
      // if not heated a lot, sometimes become water
      if (!anyTypesHaveAllTags(getAdjacentTypes(w, c, i), ["boiler"])) {
        if (w.getRandomFloat() > 0.95) {
          w.tryMutateTypeOfBlock(c, i, waterMat);
        }
      }
    };
  }
}));

// TODO figure out why acid & lava can't penetrate upper/lower chunk borders
standardBlockTypes.push(new BlockType({
  name: "Acid",
  color: Color.fromHex("#26d15f"),
  densityFunc: densityConstant(120),
  numbers: [["acid-resistance", 1]],
  tags: ["fluid", "liquid", "falling", "unstable"],
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
  numbers: [["acid-resistance", 0.7]],
  tags: ["fluid", "liquid", "falling", "unstable", "stone-based", "hot", "boiler", "melter"],
  tickBehaviorGen: () => updateFlow(0.02, updateStatic),
  // TODO random solidify if touching hydrating block
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
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "falling", "unstable"],
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
  numbers: [["acid-resistance", 0]],
  tags: ["solid", "unstable", "falling", "organic"],
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
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable", "invincible"],
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
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable", "invincible"],
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

standardBlockTypes.push(new BlockType({
  name: "Plant",
  color: Color.fromHex("#5a0"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "stable", "organic", "plant"],
}));

standardBlockTypes.push(new BlockType({
  name: "Flower",
  color: Color.fromHex("#faf"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0]],
  tags: ["solid", "stable", "organic", "plant"],
}));

standardBlockTypes.push(new BlockType({
  name: "Seed",
  color: Color.fromHex("#380"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "falling", "organic", "plant"],
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const seedMat = world_init.getBlockTypeIndex("Seed") ?? 0;
    const plantMat = world_init.getBlockTypeIndex("Plant") ?? 0;
    const flowerMat = world_init.getBlockTypeIndex("Flower") ?? 0;

    return (world, chunk, i) => {
      // if no neighboring plants, fall
      let nearPlant = false;
      for (const offset of neighboringCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj === null) {
          return;
        }
        if (adj[0].getTypeOfBlock(adj[1]) === plantMat) {
          nearPlant = true;
          break;
        }
      }

      // try to fall; keep track of if it succeeds
      let fell = true;
      if (!nearPlant) {
        updateFall(() => {
          fell = false;
        })(world, chunk, i);
      } else {
        fell = false;
      }

      // if does not fall, try grow
      if (!fell) {
        const below = chunk.getNearIndexI(i, 0, -1);
        if (below === null) {
          return;
        }
        const belowMat = below[0].getTypeOfBlock(below[1]);
        if (belowMat === seedMat || (belowMat === airMat && !nearPlant)) {
          return;
        }

        const above = chunk.getNearIndexI(i, 0, 1);
        if (above === null) {
          return;
        }
        // if seeds above and ground below, become plant
        const aboveMat = above[0].getTypeOfBlock(above[1]);
        if (aboveMat === seedMat && belowMat !== seedMat && belowMat !== airMat) {
          world.trySetTypeOfBlock(chunk, i, plantMat);
          return;
        }


        // grow into air above
        for (const offset of [[-1, 1], [0, 1], [1, 1]]) {
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if (adj === null) {
            return;
          }

          const adjMat = adj[0].getTypeOfBlock(adj[1]);
          if (adjMat === airMat) {
            if (world.getRandomFloat() > (nearPlant ? 0.8 : 0)) {
              world.trySetTypeOfBlock(adj[0], adj[1], seedMat);
              world.trySetTypeOfBlock(chunk, i, plantMat);
            } else {
              if (world.getRandomFloat() > 0.7) {
                world.trySetTypeOfBlock(chunk, i, flowerMat);
              }
            }
          }
        }
      }

    };
  },
  randomTickBehaviorGen: () => (world, chunk, i) => world.queueBlock(chunk, i),
}));

standardBlockTypes.push(new BlockType({
  name: "MegaSeed",
  color: Color.fromHex("#4f8"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "falling", "organic", "plant"],
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const seedMat = world_init.getBlockTypeIndex("Seed") ?? 0;
    const megaseedMat = world_init.getBlockTypeIndex("MegaSeed") ?? 0;
    const plantMat = world_init.getBlockTypeIndex("Plant") ?? 0;
    const flowerMat = world_init.getBlockTypeIndex("Flower") ?? 0;

    return (world, chunk, i) => {
      // if no neighboring plants, fall
      let nearPlant = false;
      for (const offset of neighboringCoords) {
        const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
        if (adj === null) {
          return;
        }
        if (adj[0].getTypeOfBlock(adj[1]) === plantMat) {
          nearPlant = true;
          break;
        }
      }

      // try to fall; keep track of if it succeeds
      let fell = true;
      if (!nearPlant) {
        updateFall(() => {
          fell = false;
        })(world, chunk, i);
      } else {
        fell = false;
      }

      // if does not fall, try grow
      if (!fell) {
        const below = chunk.getNearIndexI(i, 0, -1);
        if (below === null) {
          return;
        }
        const belowMat = below[0].getTypeOfBlock(below[1]);
        if (belowMat === megaseedMat || (belowMat === airMat && !nearPlant)) {
          return;
        }

        const above = chunk.getNearIndexI(i, 0, 1);
        if (above === null) {
          return;
        }
        // if seeds above and ground below, become plant
        const aboveMat = above[0].getTypeOfBlock(above[1]);
        if (aboveMat === megaseedMat && belowMat !== megaseedMat && belowMat !== airMat) {
          world.trySetTypeOfBlock(chunk, i, plantMat);
          return;
        }


        // grow into air above
        for (const offset of [[-1, 1], [0, 1], [1, 1]]) {
          const adj = chunk.getNearIndexI(i, offset[0], offset[1]);
          if (adj === null) {
            return;
          }

          const adjMat = adj[0].getTypeOfBlock(adj[1]);
          if (adjMat === airMat) {
            if (world.getRandomFloat() > (nearPlant ? 0.6 : 0)) {
              world.trySetTypeOfBlock(adj[0], adj[1], megaseedMat);
              world.trySetTypeOfBlock(chunk, i, plantMat);
            } else {
              if (world.getRandomFloat() > 0.4) {
                world.trySetTypeOfBlock(chunk, i, flowerMat);
              }
            }
          }
        }
      }

    };
  },
  randomTickBehaviorGen: () => (world, chunk, i) => world.queueBlock(chunk, i),
}));