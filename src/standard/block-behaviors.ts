import { TickBehavior } from "../simulation/matrix-blocktype";
import Chunk, { UpdateFlags } from "../simulation/matrix-chunk";
import { DOWN, DOWN_LEFT, DOWN_RIGHT, LEFT, NPoint, RIGHT } from "../lib/NLib/npoint";

export const updateDisplaceN: (offsets: Array<NPoint>, fallback: TickBehavior) => TickBehavior =
  (offsets, fallback) =>
    (world, chunk, i) => {
      const targets: Array<[Chunk, number]> = [];
      targets.push([chunk, i]);

      const selfDensity = world.getDensityOfBlock(chunk, i);

      for (const offset of offsets) {
        const targetCI = chunk.getNearIndexI(i, offset.x, offset.y);
        if (targetCI === null
          || targetCI[0].getFlagOfBlock(targetCI[1], UpdateFlags.LOCKED)
          || world.getDensityOfBlock(targetCI[0], targetCI[1]) >= selfDensity) {

          fallback(world, chunk, i);
          return;
        }

        targets.push(targetCI);
      }

      // swap all intermediate blocks backwards
      for (let j = 0; j < targets.length - 1; j++) {
        const dest = targets[j];
        const src = targets[j + 1];
        world.setBlockData(dest[0], dest[1], src[0].getBlockData(src[1]));
      }

      // put the main block into the final position
      const last = targets[targets.length - 1];
      world.setBlockData(last[0], last[1], chunk.getBlockData(i));
    };

export const updateDisplace1: (offset: NPoint, fallback: TickBehavior) => TickBehavior =
  // (offset, fallback) => updateDisplaceN([offset], fallback);
  // ^ this works, but is slower
  (offset, fallback) => (world, chunk, i) => {
    const targetCI = chunk.getNearIndexI(i, offset.x, offset.y);
    if (targetCI === null
      || targetCI[0].getFlagOfBlock(targetCI[1], UpdateFlags.LOCKED)
      || world.getDensityOfBlock(targetCI[0], targetCI[1]) >= world.getDensityOfBlock(chunk, i)) {
      fallback(world, chunk, i);
      return;
    }

    world.setBlockData(targetCI[0], targetCI[1], chunk.getBlockData(i));
    world.setBlockData(chunk, i, targetCI[0].getBlockData(targetCI[1]));
  };

export const updateDisplace2: (offset1: NPoint, offset2: NPoint, fallback: TickBehavior) => TickBehavior =
  // (offset1, offset2, fallback) => updateDisplaceN([offset1, offset2], fallback);
  // ^ this works, but is slower
  (offset1, offset2, fallback) => (world, chunk, i) => {
    const selfDensity = world.getDensityOfBlock(chunk, i);

    const target1CI = chunk.getNearIndexI(i, offset1.x, offset1.y);
    if (target1CI === null
      || target1CI[0].getFlagOfBlock(target1CI[1], UpdateFlags.LOCKED)
      || world.getDensityOfBlock(target1CI[0], target1CI[1]) >= selfDensity) {
      fallback(world, chunk, i);
      return;
    }

    const target2CI = chunk.getNearIndexI(i, offset2.x, offset2.y);
    if (target2CI === null
      || target2CI[0].getFlagOfBlock(target2CI[1], UpdateFlags.LOCKED)
      || world.getDensityOfBlock(target2CI[0], target2CI[1]) >= selfDensity) {
      fallback(world, chunk, i);
      return;
    }

    world.setBlockData(target2CI[0], target2CI[1], chunk.getBlockData(i));
    world.setBlockData(target1CI[0], target1CI[1], target2CI[0].getBlockData(target2CI[1]));
    world.setBlockData(chunk, i, target1CI[0].getBlockData(target1CI[1]));
  };

export const updateFall: (fallback: TickBehavior) => TickBehavior =
  (fallback) => updateDisplace1(DOWN, fallback);

export const updateCrumble: (fallback: TickBehavior) => TickBehavior =
  (fallback) => updateFall((w, c, i) => {
    if (w.getRandomFloat() > 0.5) {
      updateDisplace2(LEFT, DOWN_LEFT, fallback)(w, c, i);
    } else {
      updateDisplace2(RIGHT, DOWN_RIGHT, fallback)(w, c, i);
    }
  });

export const updateCascade: (fallback: TickBehavior) => TickBehavior =
  (fallback) => updateFall((w, c, i) => {
    if (w.getRandomFloat() > 0.5) {
      updateDisplace2(LEFT, DOWN_LEFT, updateDisplace2(RIGHT, DOWN_RIGHT, fallback))(w, c, i);
    } else {
      updateDisplace2(RIGHT, DOWN_RIGHT, updateDisplace2(LEFT, DOWN_LEFT, fallback))(w, c, i);
    }
  });

export const updateFlow: (moveChance: number, fallback: TickBehavior) => TickBehavior =
  (moveChance, fallback) => updateCascade((w, c, i) => {
    if (w.getRandomFloat() <= moveChance) {
      if (w.getRandomFloat() > 0.5) {
        updateDisplace1(LEFT, updateDisplace1(RIGHT, fallback))(w, c, i);
      } else {
        updateDisplace1(RIGHT, updateDisplace1(LEFT, fallback))(w, c, i);
      }
    } else {
      w.queueBlock(c, i);
    }
  });
