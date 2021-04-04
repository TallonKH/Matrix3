import { Chunk, CHUNK_SIZE2, World, WorldGenerator, BlockId, ChunkCoord, BlockType } from "./base";
import GridDisplay from "./display";
import { Color } from "./library";

class CheckerGen extends WorldGenerator {
  private typeA?: BlockId;
  private typeB?: BlockId;
  constructor(world: World) {
    super(world);
  }

  public init(): boolean {
    this.typeA = this.world.getBlockTypeIndex("air") ?? 0;
    this.typeB = this.world.getBlockTypeIndex("stone") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, chunkCoord: ChunkCoord): Chunk {
    const grid = new Uint16Array(CHUNK_SIZE2);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    grid.fill(((chunkCoord.x & 1) ^ (chunkCoord.y & 1)) ? this.typeA! : this.typeB!);
    return new Chunk(chunkCoord, grid);
  }
}

const bt_air = new BlockType({
  name: "air",
  color: new Color(0.9, 1, 1),
});

const bt_stone = new BlockType({
  name: "stone",
  color: new Color(0.9, 1, 1),
});

const world = new World((w: World) => new CheckerGen(w));
world.addBlockType(bt_air);
world.addBlockType(bt_stone);
world.init();

const mainDisplay = new GridDisplay();
mainDisplay.init();
mainDisplay.canvas.style.width = "100%";
mainDisplay.canvas.style.height = "100%";
document.body.appendChild(mainDisplay.canvas);