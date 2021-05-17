import { TickBehavior, UpdateFlags, updateStatic } from "./base";
import { NPoint } from "./lib/NLib/npoint";
import { Chunk } from "./base";

const DOWN = new NPoint(0, 1);
const UP = new NPoint(0, -1);
const LEFT = new NPoint(-1, 0);
const RIGHT = new NPoint(1, 0);
const DOWN_LEFT = new NPoint(-1, 1);
const UP_LEFT = new NPoint(-1, 1);
const DOWN_RIGHT = new NPoint(1, 1);
const UP_RIGHT = new NPoint(1, -1);

export const updateMultiSwap: (offsets: Array<NPoint>, fallback: TickBehavior) => TickBehavior =
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

export const updateSwap: (offset: NPoint, fallback: TickBehavior) => TickBehavior =
  (offset, fallback) => updateMultiSwap([offset], fallback);

export const updateFall: (fallback: TickBehavior) => TickBehavior =
  (fallback) => updateSwap(DOWN, fallback);

export const updateCrumble: (fallback: TickBehavior) => TickBehavior =
  (fallback) => updateFall((w, c, i) => {
    if (w.getRandomFloat() > 0.5) {
      updateMultiSwap([LEFT, DOWN_LEFT], fallback)(w, c, i);
    } else {
      updateMultiSwap([RIGHT, DOWN_RIGHT], fallback)(w, c, i);
    }
  });

export const updateCascade: (fallback: TickBehavior) => TickBehavior =
  (fallback) => updateFall((w, c, i) => {
    if (w.getRandomFloat() > 0.5) {
      updateMultiSwap([LEFT, DOWN_LEFT], updateMultiSwap([RIGHT, DOWN_RIGHT], fallback))(w, c, i);
    } else {
      updateMultiSwap([RIGHT, DOWN_RIGHT], updateMultiSwap([LEFT, DOWN_LEFT], fallback))(w, c, i);
    }
  });

export const updateFlow: (moveChance: number, fallback: TickBehavior) => TickBehavior =
  (moveChance, fallback) => updateCascade((w, c, i) => {
    if (w.getRandomFloat() <= moveChance) {
      if (w.getRandomFloat() > 0.5) {
        updateSwap(LEFT, updateSwap(RIGHT, fallback))(w, c, i);
      } else {
        updateSwap(RIGHT, updateSwap(LEFT, fallback))(w, c, i);
      }
    } else {
      w.queueBlock(c, i);
    }
  });
