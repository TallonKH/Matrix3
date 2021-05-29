import BlockType, { TickBehavior } from "../simulation/matrix-blocktype";
import Chunk, { UpdateFlags } from "../simulation/matrix-chunk";
import { DOWN, DOWN_LEFT, DOWN_RIGHT, LEFT, NPoint, RIGHT, UP, UP_LEFT, UP_RIGHT } from "../lib/NLib/npoint";
import World from "../simulation/matrix-world";
import { iterMap } from "../library";

export const ADJ_COORDS = [LEFT, RIGHT, UP, DOWN];
export const CORNER_COORDS = [DOWN_LEFT, DOWN_RIGHT, UP_LEFT, UP_RIGHT];
export const NEIGHBOR_COORDS = Array.from([...CORNER_COORDS, ...ADJ_COORDS]);

export const trySetBlock = (w: World, rel: [Chunk, number], typeIndex: number): boolean => w.trySetTypeOfBlock(rel[0], rel[1], typeIndex);
export const tryMutateBlock = (w: World, rel: [Chunk, number], typeIndex: number): boolean => w.tryMutateTypeOfBlock(rel[0], rel[1], typeIndex);

export const anyHaveTag = (types: Iterable<BlockType>, tag: string): boolean => {
  for(const typ of types){
    if(typ.hasTag(tag)){
      return true;
    }
  }
  return false;
};

/**
 * Returns `true` iff any provided type contains every specified tag
 */
export const anyHaveAllTags = (types: Iterable<BlockType>, tags: Array<string>): boolean => {
  for (const typ of types) {
    if (tags.every((tag) => typ.hasTag(tag))) {
      return true;
    }
  }
  return false;
};

/**
 * Returns `true` iff every specified tag occurs at least once in at least one provided type
 */
export const allTagsPresent = (types: Iterable<BlockType>, tags: Array<string>): boolean => {
  for (const tag of tags) {
    let found = false;
    for (const typ of types) {
      if (typ.hasTag(tag)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
};

/**
* Returns `true` iff all provided relative blocks have all specified tags.
*/
export const allHaveTag = (types: Iterable<BlockType>, tag: string): boolean => {
  for (const typ of types) {
    if (typ.hasTag(tag)) {
      return false;
    }
  }
  return true;
};

/**
* Returns `true` iff all provided relative blocks have all specified tags.
*/
export const allHaveAllTags = (types: Iterable<BlockType>, tags: Array<string>): boolean => {
  for (const typ of types) {
    if (!tags.every((tag) => typ.hasTag(tag))) {
      return false;
    }
  }
  return true;
};


/**
* Returns `true` iff the specified relative block has all specified tags.
*/
export const relativeHasTag = (w: World, c: Chunk, i: number, ox: number, oy: number, tag: string): boolean => {
  const adj = c.getNearIndexI(i, ox, oy);
  if (adj === null) {
    return false;
  }
  return getTypeOfBlock(w, adj).hasTag(tag);
};


/**
* Returns `true` iff the specified relative block has all specified tags.
*/
export const relativeHasAllTags = (w: World, c: Chunk, i: number, ox: number, oy: number, tags: Array<string>): boolean => {
  const adj = c.getNearIndexI(i, ox, oy);
  if (adj === null) {
    return false;
  }
  return tags.every((tag) => getTypeOfBlock(w, adj).hasTag(tag));
};

/**
 * Gets the BlockType`s of all provided block references. 
 * THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
 */
export const getTypesOfBlocks = function* (w: World, refs: Iterable<[Chunk, number]>): Generator<BlockType> {
  for (const ref of refs) {
    yield getTypeOfBlock(w, ref);
  }
};

export const getTypeOfBlock = (w: World, ref: [Chunk, number]): BlockType =>
  w.getBlockType(ref[0].getTypeIndexOfBlock(ref[1]));

export const filterBlocksByType = function* (w: World, refs: Iterable<[Chunk, number]>, filter: (t: BlockType) => boolean): Generator<[[Chunk, number], BlockType]> {
  for (const ref of refs) {
    const typ = getTypeOfBlock(w, ref);
    if (filter(typ)) {
      yield [ref, typ];
    }
  }
};

/**
 * Gets the `BlockType`s of all neighboring blocks that exist.
 * THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
 */
export const getNeighboringTypes = (w: World, c: Chunk, i: number): Iterable<BlockType> =>
  getRelativesTypes(w, c, i, NEIGHBOR_COORDS);

/**
 * Gets the `BlockType`s of all left/right/upper/lower blocks that exist.
 * THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
 */
export const getAdjacentTypes = (w: World, c: Chunk, i: number): Iterable<BlockType> =>
  getRelativesTypes(w, c, i, ADJ_COORDS);

/**
* Gets the `BlockType`s of all specified relative blocks that exist.
* THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
*/
export const getRelativesTypes = (w: World, c: Chunk, i: number, relativeCoords: Array<NPoint>): Iterable<BlockType> =>
  getTypesOfBlocks(w, getRelatives(c, i, relativeCoords));

/**
* Gets [chunk,index] references to all neighboring blocks that exist.
* THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
*/
export const getNeighbors = (c: Chunk, i: number): Iterable<[Chunk, number]> =>
  getRelatives(c, i, NEIGHBOR_COORDS);

/**
* Gets [chunk,index] references to all left/right/upper/lower blocks that exist.
* THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
*/
export const getAdjacents = (c: Chunk, i: number): Iterable<[Chunk, number]> =>
  getRelatives(c, i, ADJ_COORDS);

/**
* Gets [chunk,index] references to all specified relative blocks that exist.
* THIS RETURNS AN ITERATOR! If you need to iterate multiple times, use Array.from()
*/
export const getRelatives = function* (c: Chunk, i: number, relativeCoords: Iterable<NPoint>): Generator<[Chunk, number]> {
  for (const coord of relativeCoords) {
    const adj = c.getNearIndexI(i, coord.x, coord.y);
    if (adj !== null) {
      yield adj;
    }
  }
};

export const updateDisplaceN = (offsets: Array<NPoint>, fallback: TickBehavior): TickBehavior =>
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
      world.setBlockData(dest[0], dest[1], src[0].getDataOfBlock(src[1]));
    }

    // put the main block into the final position
    const last = targets[targets.length - 1];
    world.setBlockData(last[0], last[1], chunk.getDataOfBlock(i));
  };

// (offset, fallback) => updateDisplaceN([offset], fallback);
// ^ this works, but is slower
export const updateDisplace1 = (offset: NPoint, fallback: TickBehavior): TickBehavior =>
  (world, chunk, i) => {
    const targetCI = chunk.getNearIndexI(i, offset.x, offset.y);
    if (targetCI === null
      || targetCI[0].getFlagOfBlock(targetCI[1], UpdateFlags.LOCKED)
      || world.getDensityOfBlock(targetCI[0], targetCI[1]) >= world.getDensityOfBlock(chunk, i)) {
      fallback(world, chunk, i);
      return;
    }

    world.setBlockData(targetCI[0], targetCI[1], chunk.getDataOfBlock(i));
    world.setBlockData(chunk, i, targetCI[0].getDataOfBlock(targetCI[1]));
  };

// (offset1, offset2, fallback) => updateDisplaceN([offset1, offset2], fallback);
// ^ this works, but is slower
export const updateDisplace2 = (offset1: NPoint, offset2: NPoint, fallback: TickBehavior): TickBehavior =>
  (world, chunk, i) => {
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

    world.setBlockData(target2CI[0], target2CI[1], chunk.getDataOfBlock(i));
    world.setBlockData(target1CI[0], target1CI[1], target2CI[0].getDataOfBlock(target2CI[1]));
    world.setBlockData(chunk, i, target1CI[0].getDataOfBlock(target1CI[1]));
  };

export const updateFall = (fallback: TickBehavior): TickBehavior =>
  updateDisplace1(DOWN, fallback);

export const updateCrumble = (fallback: TickBehavior): TickBehavior =>
  updateFall((w, c, i) => {
    if (w.getRandomFloat() > 0.5) {
      updateDisplace2(LEFT, DOWN_LEFT, fallback)(w, c, i);
    } else {
      updateDisplace2(RIGHT, DOWN_RIGHT, fallback)(w, c, i);
    }
  });

export const updateCascade = (fallback: TickBehavior): TickBehavior => updateFall((w, c, i) => {
  if (w.getRandomFloat() > 0.5) {
    updateDisplace2(LEFT, DOWN_LEFT, updateDisplace2(RIGHT, DOWN_RIGHT, fallback))(w, c, i);
  } else {
    updateDisplace2(RIGHT, DOWN_RIGHT, updateDisplace2(LEFT, DOWN_LEFT, fallback))(w, c, i);
  }
});

export const updateFlow = (moveChance: number, fallback: TickBehavior): TickBehavior =>
  updateCascade((w, c, i) => {
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
