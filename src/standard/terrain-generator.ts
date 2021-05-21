import Chunk from "../simulation/matrix-chunk";
import World from "../simulation/matrix-world";
import WorldGenerator from "../simulation/matrix-worldgen";

export class CheckerGen extends WorldGenerator {
  private typeA = 0;
  private typeB = 0;
  private typeC = 0;
  private typeD = 0;
  constructor(world: World) {
    super(world);
  }

  public init(): boolean {
    this.typeA = this.world.getBlockTypeIndex("water") ?? 0;
    this.typeB = this.world.getBlockTypeIndex("gravel") ?? 0;
    this.typeC = this.world.getBlockTypeIndex("stone") ?? 0;
    this.typeD = this.world.getBlockTypeIndex("air") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, x: number, y: number, chunk: Chunk): void {
    const grid = chunk.getBlockTypes();
    grid.fill((x & 1) ^ (y & 1) ? ((y & 2) ^ (x & 2) ? this.typeC : this.typeA) : ((y & 5) ^ (x & 3) ? this.typeD : this.typeB));
  }
}