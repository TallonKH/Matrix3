import { makeNoise2D } from "fast-simplex-noise";
import { CHUNK_BITSHIFT, CHUNK_SIZE } from "../matrix-common";
import Chunk from "../simulation/matrix-chunk";
import World from "../simulation/matrix-world";
import WorldGenerator from "../simulation/matrix-worldgen";

export class CheckerGen extends WorldGenerator {
  private matAir = 0;
  private matGrass = 0;
  private matDirt = 0;
  private matStone = 0;
  private matWater = 0;
  private matGravel = 0;
  private matSand = 0;

  private noise2;
  constructor(world: World) {
    super(world);
    this.noise2 = makeNoise2D();
  }

  public init(): boolean {
    this.matAir = this.world.getBlockTypeIndex("air") ?? 0;
    this.matGrass = this.world.getBlockTypeIndex("grass") ?? 0;
    this.matDirt = this.world.getBlockTypeIndex("dirt") ?? 0;
    this.matStone = this.world.getBlockTypeIndex("stone") ?? 0;
    this.matWater = this.world.getBlockTypeIndex("water") ?? 0;
    this.matGravel = this.world.getBlockTypeIndex("gravel") ?? 0;
    this.matSand = this.world.getBlockTypeIndex("sand") ?? 0;
    
    return (
      this.matAir &
      this.matGrass &
      this.matDirt &
      this.matStone &
      this.matWater &
      this.matGravel &
      this.matSand
    ) > 0;
  }

  public generate(world: World, cx: number, cy: number, chunk: Chunk): void {
    const ax = cx << CHUNK_BITSHIFT;
    const ay = cy << CHUNK_BITSHIFT;

    for (let bx = 0; bx < CHUNK_SIZE; bx++) {
      const x = ax + bx;
      const height = this.noise2(x * 0.005, 0) * 20 + this.noise2(x * 0.001, 10) * 100;
      for (let by = 0; by < CHUNK_SIZE; by++) {
        const y = ay + by;
        const i = bx + (by << CHUNK_BITSHIFT);

        const cave = ((this.noise2(x * 0.001, y * 0.002) * 0.95 + this.noise2(x * 0.01, y * 0.01) * 0.05) + 1) / 2;
        const gravelSplotch = (this.noise2(x * 0.01, y * 0.01) + 1) / 2;

        let block;
        // water level
        if (y > height) {
          block = y > 0 ? this.matAir : this.matWater;
        } else {
          // caves
          if ((height > 5 || y < height - 6) && (cave > 0.5 && cave < 0.55)) {
            block = this.matAir;
          } else {
            // surface materials | ground materials
            if (y > height - 5) {
              // near sea level | above sea level
              if (height < 6) {
                // beaches | ocean floor
                block = height < -4 ? this.matGravel : this.matSand;
              } else {
                // grass | dirt
                block = y > height - 1 ? this.matGrass : this.matDirt;
              }
            } else {
              block = gravelSplotch > 0.9 ? this.matGravel : this.matStone;
            }
          }
        }
        chunk.setCurrentTypeOfBlock(i, block);
      }
    }
  }
}