import { Color } from "../library";
import { allHaveTag, allTagsPresent, anyHaveAllTags, anyHaveTag, filterBlocksByType, getAdjacents, getAdjacentTypes, getNeighboringTypes, getNeighbors, getRelatives, getTypeOfBlock, getTypesOfBlocks, relativeHasTag, trySetBlock, updateCascade, updateCrumble, updateFall, updateFlow } from "./standard-behaviors";
import BlockType, { densityConstant, TickBehavior, updateStatic } from "../simulation/matrix-blocktype";
import World from "../simulation/matrix-world";
import { DOWN, LEFT, RIGHT, UP, UP_LEFT, UP_RIGHT } from "../lib/NLib/npoint";
import Chunk from "../simulation/matrix-chunk";

export const standardBlockTypes: Array<BlockType> = [];

standardBlockTypes.push(new BlockType({
  name: "Air",
  color: Color.fromHex("#e6f2ff"),
  densityFunc: densityConstant(10),
  numbers: [["acid-resistance", 1]],
  tags: ["replaceable", "breathable", "fluid", "gas", "uncloneable"],
  tickBehaviorGen: () => updateFlow(1, updateStatic),
}));


standardBlockTypes.push(new BlockType({
  name: "Gravel",
  color: Color.fromHex("#5a5452"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "unbreathable", "falling", "crumbling", "stone-based", "earth", "meltable"],
  tickBehaviorGen: () => updateCrumble(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const lavaMat = world_init.getBlockTypeIndex("Glass") ?? 0;

    return (w, c, i) => {
      // become lava if melted
      if (anyHaveTag(getAdjacentTypes(w, c, i), "melter")) {
        w.tryMutateTypeOfBlock(c, i, lavaMat);
        return;
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Dirt",
  color: Color.fromHex("#7E572E"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "unbreathable", "falling", "crumbling", "soil", "earth", "grassable"],
  tickBehaviorGen: () => updateCrumble(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const mudMat = world_init.getBlockTypeIndex("Mud") ?? 0;

    return (w, c, i) => {
      // become mud if hydrated
      if (anyHaveTag(getAdjacentTypes(w, c, i), "hydrating")) {
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
  tags: ["solid", "unstable", "unbreathable", "falling", "cascading", "sandy", "earth", "meltable"],
  tickBehaviorGen: () => updateCascade(updateStatic),
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const glassMat = world_init.getBlockTypeIndex("Glass") ?? 0;
    const wetSandMat = world_init.getBlockTypeIndex("Wet Sand") ?? 0;

    return (w, c, i) => {
      const adjTypes = Array.from(getAdjacentTypes(w, c, i));
      // become glass if melted
      // TODO molten glass
      if (anyHaveTag(adjTypes, "melter")) {
        w.tryMutateTypeOfBlock(c, i, glassMat);
        return;
      }
      // become wet sand if hydrated
      if (anyHaveTag(adjTypes, "hydrating")) {
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
  tags: ["solid", "stable", "unbreathable", "virus-immune"],
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "Wet Sand",
  color: Color.fromHex("#978157"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.2]],
  tags: ["solid", "unstable", "unbreathable", "falling", "sandy", "earth", "wet"],
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const sandMat = world_init.getBlockTypeIndex("Sand") ?? 0;

    return (w, c, i) => {
      // dry out when heated
      if (anyHaveTag(getAdjacentTypes(w, c, i), "hot")) {
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
  tags: ["solid", "unstable", "unbreathable", "falling", "soil", "earth", "wet", "grassable"],
  tickBehaviorGen: (world_init: World): TickBehavior => {
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;

    return (w, c, i) => {
      // dry out when heated
      if (anyHaveTag(getAdjacentTypes(w, c, i), "hot")) {
        w.tryMutateTypeOfBlock(c, i, dirtMat);
        return;
      }

      updateFall(updateStatic)(w, c, i);
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Grass",
  color: Color.fromHex("#3ecb10"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "unbreathable", "falling", "earth", "plant", "organic", "soil"],
  tickBehaviorGen: (world_init) => {
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;

    return (w, c, i) => {
      // if lacking air or soil, become dirt sometimes
      if (w.getRandomFloat() > 0.9 && !allTagsPresent(Array.from(getAdjacentTypes(w, c, i)), ["soil", "breathable"])) {
        w.tryMutateTypeOfBlock(c, i, dirtMat);
        return;
      }

      updateFall(updateStatic)(w, c, i);
    };
  },
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const grassMat = world_init.getBlockTypeIndex("Grass") ?? 0;
    const dirtMat = world_init.getBlockTypeIndex("Dirt") ?? 0;
    return (w, c, i) => {
      const adjs = Array.from(getNeighbors(c, i));
      const typs = Array.from(getTypesOfBlocks(w, adjs));

      // if lacking air or soil, become dirt (do this in randomTick also with no random chance)
      if (!allTagsPresent(Array.from(typs), ["soil", "breathable"])) {
        w.tryMutateTypeOfBlock(c, i, dirtMat);
        return;
      }

      // try to create more grass
      for (let i = 0; i < adjs.length; i++) {
        if (typs[i].hasTag("grassable")) {
          const adj = adjs[i];
          // make sure candidate is has air & soil
          if (allTagsPresent(Array.from(getAdjacentTypes(w, adj[0], adj[1])), ["soil", "breathable"])) {
            w.tryMutateTypeOfBlock(adj[0], adj[1], grassMat);
          }
        }
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Moss",
  color: Color.fromHex("#4b7006"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "stable", "unbreathable", "plant", "organic", "hydrating"],
  tickBehaviorGen: (world_init) => {
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;

    return (w, c, i) => {
      // if lacking air or soil, become water sometimes
      if (w.getRandomFloat() > 0.9 && !allTagsPresent(Array.from(getAdjacentTypes(w, c, i)), ["hydrating", "breathable"])) {
        w.tryMutateTypeOfBlock(c, i, waterMat);
        return;
      }
    };
  },
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const mossMat = world_init.getBlockTypeIndex("Moss") ?? 0;
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;

    return (w, c, i) => {
      const adjs = Array.from(getNeighbors(c, i));
      const typs = Array.from(getTypesOfBlocks(w, adjs));

      // if lacking air or water, become water (do this in randomTick also with no random chance)
      if (!allTagsPresent(Array.from(typs), ["hydrating", "breathable"])) {
        w.tryMutateTypeOfBlock(c, i, waterMat);
        return;
      }

      // try to create more moss
      for (let i = 0; i < adjs.length; i++) {
        if (typs[i].hasTag("mossable")) {
          const adj = adjs[i];
          // make sure candidate is has air & soil
          if (allTagsPresent(Array.from(getAdjacentTypes(w, adj[0], adj[1])), ["hydrating", "breathable"])) {
            w.tryMutateTypeOfBlock(adj[0], adj[1], mossMat);
          }
        }
      }
    };
  },
}));


standardBlockTypes.push(new BlockType({
  name: "Coater",
  color: Color.fromHex("#7227ab"),
  densityFunc: densityConstant(200),
  numbers: [["acid-resistance", 0]],
  tags: ["solid", "stable", "goo-immune", "virus-immune"],
  tickBehaviorGen: (world_init) => {
    const coaterMat = world_init.getBlockTypeIndex("Coater") ?? 0;
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;

    return (w, c, i) => {
      const adjs = Array.from(getAdjacents(c, i));
      const typs = Array.from(getTypesOfBlocks(w, adjs));
      // const typs = Array.from(getTypesOfBlocks(w, adjs));
      // to prevent stupidity, kill if near void or cloner
      if (anyHaveTag(typs, "void") || anyHaveTag(typs, "cloner")) {
        w.tryMutateTypeOfBlock(c, i, airMat);
        return;
      }

      // if lacking air or surface, become air
      if (w.getRandomFloat() > 0.2 && !allTagsPresent(typs, ["unbreathable", "breathable"])) {
        w.tryMutateTypeOfBlock(c, i, airMat);
        return;
      }

      const neis = Array.from(getNeighbors(c, i));
      // try to create more grass
      for (let i = 0; i < neis.length; i++) {
        const nei = neis[i];
        if (getTypeOfBlock(w, nei).hasTag("replaceable")) {
          const neisTypes = Array.from(getAdjacentTypes(w, nei[0], nei[1]));

          // to prevent stupidity, do not generate near void or cloner
          if (anyHaveTag(neisTypes, "void") || anyHaveTag(neisTypes, "cloner")) {
            continue;
          }

          // make sure candidate has surface and air
          if (allTagsPresent(neisTypes, ["unbreathable", "breathable"])) {
            w.tryMutateTypeOfBlock(nei[0], nei[1], coaterMat);
          }
        }
      }
    };
  },
  randomTickBehaviorGen: () => (w, c, i) => w.queueBlock(c, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Stone",
  color: Color.fromHex("#787878"),
  densityFunc: densityConstant(200),
  numbers: [["acid-resistance", 0.7]],
  tags: ["solid", "stable", "unbreathable", "earth", "stone-based", "meltable"],
  randomTickBehaviorGen: (world_init: World): TickBehavior => {
    const lavaMat = world_init.getBlockTypeIndex("Lava") ?? 0;

    return (w, c, i) => {
      // become lava if melted
      if (anyHaveTag(getAdjacentTypes(w, c, i), "melter")) {
        w.tryMutateTypeOfBlock(c, i, lavaMat);
        return;
      }
    };
  },
}));

standardBlockTypes.push(new BlockType({
  name: "Barrier",
  color: Color.fromHex("#e55"),
  densityFunc: densityConstant(250),
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable", "unbreathable", "invincible", "uncloneable"],
  tickBehaviorGen: () => updateStatic,
}));

standardBlockTypes.push(new BlockType({
  name: "Water",
  color: Color.fromHex("#408cff"),
  densityFunc: densityConstant(100),
  numbers: [["acid-resistance", 0.1]],
  tags: ["fluid", "liquid", "unbreathable", "falling", "unstable", "wet", "water-based", "hydrating", "boilable", "mossable"],
  tickBehaviorGen: (world_init) => {
    const steamMat = world_init.getBlockTypeIndex("Steam") ?? 0;

    return (w, c, i) => {
      // if heated a lot, instantly become steam
      if (anyHaveTag(getAdjacentTypes(w, c, i), "boiler")) {
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
      if (anyHaveTag(getAdjacentTypes(w, c, i), "hot")) {
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
  tags: ["fluid", "gas", "unbreathable", "rising", "unstable", "wet", "water-based", "hot", "boiling"],
  tickBehaviorGen: (world_init) => {
    const waterMat = world_init.getBlockTypeIndex("Water") ?? 0;

    return (w, c, i) => {
      // if cooled, instantly become water
      if (anyHaveTag(getAdjacentTypes(w, c, i), "cold")) {
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
      if (!anyHaveTag(getAdjacentTypes(w, c, i), "boiler")) {
        if (w.getRandomFloat() > 0.95) {
          w.tryMutateTypeOfBlock(c, i, waterMat);
        }
      }
    };
  }
}));

standardBlockTypes.push(new BlockType({
  name: "Acid",
  color: Color.fromHex("#26d15f"),
  densityFunc: densityConstant(120),
  numbers: [["acid-resistance", 1]],
  tags: ["fluid", "unbreathable", "liquid", "falling", "unstable"],
  tickBehaviorGen: (world_init) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const affectedSides = [LEFT, RIGHT, DOWN];
    return (w, c, i) => {
      for (const adj of getRelatives(c, i, affectedSides)) {
        const typ = getTypeOfBlock(w, adj);
        if (!typ.hasTag("invincible")) {
          continue;
        }

        // try destroy other
        if (w.getRandomFloat() > (typ.getNumber("acid-resistance") ?? 0.1)) {
          w.trySetTypeOfBlock(adj[0], adj[1], airMat);
          // destroy self
          if (w.getRandomFloat() > 0.7) {
            w.trySetTypeOfBlock(c, i, airMat);
          }
        }
      }
      updateFlow(0.8, updateStatic)(w, c, i);
    };
  },
  randomTickBehaviorGen: () => (w, c, i) => w.queueBlock(c, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Lava",
  color: Color.fromHex("#ff3500"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.7]],
  tags: ["fluid", "liquid", "unbreathable", "falling", "unstable", "stone-based", "hot", "boiler", "melter"],
  tickBehaviorGen: (world_init: World) => {
    return (w, c, i) => {
      const stoneMat = world_init.getBlockTypeIndex("Stone") ?? 0;

      // if touching something wet, make self stone
      if (w.getRandomFloat() > 0.95) {
        if (anyHaveTag(getAdjacentTypes(w, c, i), "wet")) {
          w.tryMutateTypeOfBlock(c, i, stoneMat);
          return;
        }
      }

      return updateFlow(0.02, updateStatic)(w, c, i);
    };
  },
  randomTickBehaviorGen: (world_init: World) => {
    const stoneMat = world_init.getBlockTypeIndex("Stone") ?? 0;

    return (w, c, i) => {
      // if not surrounded by high temperature, make self stone
      if (w.getRandomFloat() > 0.8) {
        if (!allHaveTag(getAdjacentTypes(w, c, i), "melter")) {
          w.tryMutateTypeOfBlock(c, i, stoneMat);
          return;
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
  tags: ["solid", "falling", "unbreathable", "unstable", "goo-immune"],
  tickBehaviorGen: (world_init: World) => {
    const gooMat = world_init.getBlockTypeIndex("Gray Goo") ?? 0;

    return (w, c, i) => {
      let success = false;
      // convert surrounding solids/liquids
      for (const adj of getAdjacents(c, i)) {
        if (w.getRandomFloat() > 0.6) {
          const typ = getTypeOfBlock(w, adj);
          if (!typ.hasTag("goo-immune") && !typ.hasTag("gas") && !typ.hasTag("invincible")) {
            success ||= w.tryMutateTypeOfBlock(adj[0], adj[1], gooMat);
          }
        }
      }

      // fall if failed to convert - this gives a slightly sticky behavior
      if (!success) {
        updateCrumble(updateStatic)(w, c, i);
      }
    };
  },
  randomTickBehaviorGen: () => (w, c, i) => w.queueBlock(c, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Virus",
  color: Color.fromHex("#c066f9"),
  numbers: [["acid-resistance", 0]],
  tags: ["solid", "unstable", "unbreathable", "falling", "organic", "virus-immune"],
  densityFunc: densityConstant(50),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;
    const virusMat = world_init.getBlockTypeIndex("Virus") ?? 0;

    return (w, c, i) => {
      // randomly destroy self
      if (w.getRandomFloat() > 0.95) {
        w.trySetTypeOfBlock(c, i, airMat);
        return;
      }

      // destroy self if not connected to anything
      const stables = Array.from(filterBlocksByType(w, getAdjacents(c, i), (typ) => typ.hasTag("stable")));
      if (stables.length <= 1) {
        updateCascade(updateStatic)(w, c, i);
        return;
      }

      // convert surrounding blocks
      for (const [ref, typ] of stables) {
        if (!typ.hasTag("invincible") && !typ.hasTag("virus-immune")) {
          if (w.getRandomFloat() > 0.6) {
            w.tryMutateTypeOfBlock(ref[0], ref[1], virusMat);
          }
        }
      }
    };
  },
  randomTickBehaviorGen: () => (w, c, i) => w.queueBlock(c, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Cloner",
  color: Color.fromHex("#0aa6a9"),
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable", "unbreathable", "invincible", "cloner-killable", "uncloneable", "cloner"],
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;

    return (w, c, i) => {
      const adjs = Array.from(getAdjacents(c, i));
      const typs = Array.from(getTypesOfBlocks(w, adjs));

      const cloneables: Array<number> = [];
      const empties: Array<[Chunk, number]> = [];
      // destroy adjacent cloners & gather cloneable types
      for (let i = 0; i < adjs.length; i++) {
        const adj = adjs[i];
        const typ = typs[i];
        if (typ.hasTag("replaceable")) {
          empties.push(adj);
        } else if (typ.hasTag("cloner-killable")) {
          w.tryMutateTypeOfBlock(adj[0], adj[1], airMat);
        } else {
          cloneables.push(adj[0].getTypeIndexOfBlock(adj[1]));
        }
      }

      // do cloning
      if (cloneables.length > 0) {
        for (const empty of empties) {
          w.tryMutateTypeOfBlock(empty[0], empty[1], cloneables[~~(w.getRandomFloat() * cloneables.length)]);
        }
      }
    };
  },
  randomTickBehaviorGen: () => (w, c, i) => w.queueBlock(c, i),
}));

standardBlockTypes.push(new BlockType({
  name: "Void",
  color: Color.fromHex("#103"),
  numbers: [["acid-resistance", 1]],
  tags: ["solid", "stable", "unbreathable", "invincible", "uncloneable", "void"],
  densityFunc: densityConstant(200),
  tickBehaviorGen: (world_init: World) => {
    const airMat = world_init.getBlockTypeIndex("Air") ?? 0;

    return (w, c, i) => {
      for (const adj of getAdjacents(c, i)) {
        if (!getTypeOfBlock(w, adj).hasTag("invincible")) {
          w.tryMutateTypeOfBlock(adj[0], adj[1], airMat);
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
  tags: ["solid", "stable", "unbreathable", "organic", "plant"],
}));

standardBlockTypes.push(new BlockType({
  name: "Flower",
  color: Color.fromHex("#faf"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0]],
  tags: ["solid", "stable", "unbreathable", "organic", "plant"],
}));

standardBlockTypes.push(new BlockType({
  name: "Seed",
  color: Color.fromHex("#380"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "unbreathable", "falling", "organic", "plant"],
  tickBehaviorGen: (world_init: World) => {
    const aboveCoords = [UP_LEFT, UP, UP_RIGHT];
    const seedMat = world_init.getBlockTypeIndex("Seed") ?? 0;
    const plantMat = world_init.getBlockTypeIndex("Plant") ?? 0;
    const flowerMat = world_init.getBlockTypeIndex("Flower") ?? 0;

    return (w, c, i) => {
      const nearPlant = anyHaveAllTags(getNeighboringTypes(w, c, i), ["plant", "stable"]);

      // if no supporting plants, fall
      if (!nearPlant) {
        updateFall((w, c, i) => {
          const below = c.getNearIndexI(i, 0, -1);
          if (below === null) {
            w.queueBlock(c, i);
            return;
          }

          // if on non-seed solid ground or near plant, try grow
          const belowMatI = below[0].getTypeIndexOfBlock(below[1]);
          if (nearPlant || (belowMatI !== seedMat && w.getBlockType(belowMatI).hasTag("solid"))) {
            // if solids above, abort & become plant
            if (relativeHasTag(w, c, i, 0, 1, "solid")) {
              w.tryMutateTypeOfBlock(c, i, plantMat);
              return;
            }

            // proceed with trying to grow
            for (const above of getRelatives(c, i, aboveCoords)) {
              if (!getTypeOfBlock(w, above).hasTag("gas")) {
                continue;
              }

              if (w.getRandomFloat() > (nearPlant ? 0.8 : 0)) {
                trySetBlock(w, above, seedMat);
                w.tryMutateTypeOfBlock(c, i, plantMat);
              } else if (w.getRandomFloat() > 0.7) {
                w.trySetTypeOfBlock(c, i, flowerMat);
              }
            }
          }
        })(w, c, i);
      }
    };
  },
  randomTickBehaviorGen: () => (w, c, i) => w.queueBlock(c, i),
}));

standardBlockTypes.push(new BlockType({
  name: "MegaSeed",
  color: Color.fromHex("#4f8"),
  densityFunc: densityConstant(150),
  numbers: [["acid-resistance", 0.1]],
  tags: ["solid", "unstable", "unbreathable", "falling", "organic", "plant"],
  tickBehaviorGen: (world_init: World) => {
    const aboveCoords = [UP_LEFT, UP, UP_RIGHT];
    const seedMat = world_init.getBlockTypeIndex("Seed") ?? 0;
    const plantMat = world_init.getBlockTypeIndex("Plant") ?? 0;
    const flowerMat = world_init.getBlockTypeIndex("Flower") ?? 0;

    return (w, c, i) => {
      const nearPlant = anyHaveAllTags(getNeighboringTypes(w, c, i), ["plant", "stable"]);

      // if no supporting plants, fall
      if (!nearPlant) {
        updateFall((w, c, i) => {
          const below = c.getNearIndexI(i, 0, -1);
          if (below === null) {
            w.queueBlock(c, i);
            return;
          }

          // if on non-seed solid ground or near plant, try grow
          const belowMatI = below[0].getTypeIndexOfBlock(below[1]);
          if (nearPlant || (belowMatI !== seedMat && w.getBlockType(belowMatI).hasTag("solid"))) {
            // if solids above, abort & become plant
            if (relativeHasTag(w, c, i, 0, 1, "solid")) {
              w.tryMutateTypeOfBlock(c, i, plantMat);
              return;
            }

            // proceed with trying to grow
            for (const above of getRelatives(c, i, aboveCoords)) {
              if (!getTypeOfBlock(w, above).hasTag("gas")) {
                continue;
              }

              if (w.getRandomFloat() > (nearPlant ? 0.6 : 0)) {
                trySetBlock(w, above, seedMat);
                w.tryMutateTypeOfBlock(c, i, plantMat);
              } else if (w.getRandomFloat() > 0.7) {
                w.trySetTypeOfBlock(c, i, flowerMat);
              }
            }
          }
        })(w, c, i);
      }
    };
  },
  randomTickBehaviorGen: (world_init) => {
    const flowerMat = world_init.getBlockTypeIndex("Flower") ?? 0;
    return (w, c, i) => w.tryMutateTypeOfBlock(c, i, flowerMat);
  },
}));