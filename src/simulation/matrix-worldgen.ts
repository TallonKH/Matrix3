import Chunk from "./matrix-chunk";
import World from "./matrix-world";

export default abstract class WorldGenerator {
  public readonly world: World;
  private initialized = false;
  constructor(world: World) {
    this.world = world;
  }

  public runInit(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.init();
  }

  protected abstract init(): boolean;

  public abstract generate(world: World, x: number, y: number, chunk: Chunk): void;
}