import { Chunk, CHUNK_SIZE2, World, WorldGenerator, BlockId, BlockType, shaderLerp, UpdateFlags, CHUNK_MODMASK, CHUNK_BITSHIFT, CHUNK_SIZE, CHUNK_SIZE2m1 } from "./base";
import GridDisplay, { RedrawMode } from "./display";
import { NPoint } from "./lib/NLib/npoint";
import { Color } from "./library";

class CheckerGen extends WorldGenerator {
  private typeA: BlockId = 0;
  private typeB: BlockId = 0;
  private typeC: BlockId = 0;
  constructor(world: World) {
    super(world);
  }

  public init(): boolean {
    this.typeA = this.world.getBlockTypeIndex("air") ?? 0;
    this.typeB = this.world.getBlockTypeIndex("stone") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, x: number, y: number): Chunk {
    const grid = new Uint16Array(CHUNK_SIZE2);
    grid.fill((x & 1) ^ (y & 1) ? this.typeA : this.typeB);
    return new Chunk(x, y, grid);
  }
}

const bt_air = new BlockType({
  name: "air",
  color: new Color(0.9, 0.95, 1),
});

const bt_stone = new BlockType({
  name: "stone",
  color: new Color(0.4, 0.4, 0.4),
  shader: shaderLerp(new Color(0.35, 0.35, 0.35), new Color(0.45, 0.45, 0.45)),
});

const bt_updatium = new BlockType({
  name: "updatium",
  color: new Color(0.4, 0.4, 0.4),
  shader: (_, chunk, i) => chunk.getFlag(i, UpdateFlags.PENDING_TICK) ? new Color(0, 1, 0) : new Color(1, 0, 0),
});

const world = new World((w: World) => new CheckerGen(w));
world.addBlockType(bt_air);
world.addBlockType(bt_stone);
world.addBlockType(bt_updatium);
world.init();

const mainDisplay = new GridDisplay();
mainDisplay.canvas.style.width = "50%";
mainDisplay.canvas.style.height = "100%";
mainDisplay.canvas.style.border = "2px solid black";
mainDisplay.canvas.style.background = "linear-gradient(0deg, #0F0 0%, #040 100%)";
document.body.appendChild(mainDisplay.canvas);
mainDisplay.link(world);

const flagDisplay = new GridDisplay();
flagDisplay.canvas.style.width = "50%";
flagDisplay.canvas.style.height = "100%";
flagDisplay.canvas.style.border = "2px solid black";
flagDisplay.canvas.style.background = "linear-gradient(0deg, #F0F 0%, #404 100%)";
document.body.appendChild(flagDisplay.canvas);
flagDisplay.link(world);

// world.requestChunkLoad(1, 1);
// mainDisplay.requestChunkRedraw(new NPoint(1, 1));

world.startTickLoop();

mainDisplay.startDrawLoop();
// window.setInterval(() => {
//   mainDisplay.debugRender("shader");
// }, 100);

window.setInterval(() => {
  flagDisplay.renderViewDebug(RedrawMode.FLAGS);
}, 100);