import { Chunk, World, WorldGenerator, BlockType, shaderLerp, densityConstant, updateStatic } from "./base";
import GridDisplay, { RedrawMode } from "./display";
import { Color } from "./library";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { updateCascade, updateCrumble, updateFall } from "./tick-behaviors";

class CheckerGen extends WorldGenerator {
  private typeA = 0;
  private typeB = 0;
  constructor(world: World) {
    super(world);
  }

  public init(): boolean {
    this.typeA = this.world.getBlockTypeIndex("air") ?? 0;
    this.typeB = this.world.getBlockTypeIndex("stone") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, x: number, y: number, chunk: Chunk): void {
    const grid = chunk.getBlockTypes();
    grid.fill((x & 1) ^ (y & 1) ? this.typeA : this.typeB);
  }
}

const bt_air = new BlockType({
  name: "air",
  color: new Color(0.9, 0.95, 1),
  densityFunc: densityConstant(10),
});

const bt_stone = new BlockType({
  name: "stone",
  color: new Color(0.4, 0.4, 0.4),
  shader: shaderLerp(new Color(0.35, 0.35, 0.35), new Color(0.45, 0.45, 0.45)),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCrumble(updateStatic),
});

const world = new World((w: World) => new CheckerGen(w));
world.registerBlockType(bt_air);
world.registerBlockType(bt_stone);
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

world.startTickLoop(30);

mainDisplay.startDrawLoop();
// window.setInterval(() => {
//   mainDisplay.debugRender("shader");
// }, 100);

window.setInterval(() => {
  flagDisplay.renderViewDebug(RedrawMode.FLAGS);
}, 100);