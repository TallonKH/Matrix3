import { Chunk, World, WorldGenerator, BlockType, densityConstant, updateStatic } from "./base";
import GridDisplay, { RedrawMode } from "./display";
import { Color } from "./library";
import { shaderLerp } from "./shaders";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { updateCascade, updateCrumble, updateFall, updateFlow } from "./tick-behaviors";

class CheckerGen extends WorldGenerator {
  private typeA = 0;
  private typeB = 0;
  private typeC = 0;
  private typeD = 0;
  constructor(world: World) {
    super(world);
  }

  public init(): boolean {
    this.typeA = this.world.getBlockTypeIndex("air") ?? 0;
    this.typeB = this.world.getBlockTypeIndex("stone") ?? 0;
    this.typeC = this.world.getBlockTypeIndex("water") ?? 0;
    this.typeD = this.world.getBlockTypeIndex("cobble") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, x: number, y: number, chunk: Chunk): void {
    const grid = chunk.getBlockTypes();
    grid.fill((x & 1) ^ (y & 1) ? ((y & 2) ^ (x & 2) ? this.typeC : this.typeA) : ((y & 5)^(x & 3) ? this.typeD : this.typeB));
  }
}

const bt_air = new BlockType({
  name: "air",
  color: new Color(0.9, 0.95, 1),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
});

const bt_cobble = new BlockType({
  name: "cobble",
  color: new Color(0.4, 0.4, 0.4),
  shader: shaderLerp(new Color(0.35, 0.32, 0.32), new Color(0.47, 0.47, 0.47)),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCrumble(updateStatic),
});

const bt_stone = new BlockType({
  name: "stone",
  color: new Color(0.5, 0.5, 0.5),
  shader: shaderLerp(new Color(0.46, 0.46, 0.46), new Color(0.55, 0.55, 0.55)),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
});

const bt_water = new BlockType({
  name: "water",
  color: new Color(0.4, 0.4, 0.4),
  shader: shaderLerp(new Color(0.20, 0.42, 0.97), new Color(0.25, 0.55, 1)),
  densityFunc: densityConstant(100),
  tickBehaviorGen: () => updateFlow(0.8, updateStatic),
});

const world = new World((w: World) => new CheckerGen(w));
world.registerBlockType(bt_air);
world.registerBlockType(bt_cobble);
world.registerBlockType(bt_stone);
world.registerBlockType(bt_water);
world.init();

const a = false;
const container = document.getElementById("inner-container");
if(container === null){
  throw "no container";
}

const mainDisplay = new GridDisplay();
mainDisplay.canvas.style.height = "100%";
mainDisplay.canvas.style.width = "100%";
mainDisplay.canvas.style.border = "2px solid black";
// mainDisplay.canvas.style.background = "linear-gradient(0deg, #0F0 0%, #040 100%)";
container.appendChild(mainDisplay.canvas);
mainDisplay.link(world);

if(a){
  const flagDisplay = new GridDisplay();
  // flagDisplay.canvas.style.height = "100%";
  flagDisplay.canvas.style.border = "2px solid black";
  flagDisplay.canvas.style.background = "linear-gradient(0deg, #F0F 0%, #404 100%)";
  container.appendChild(flagDisplay.canvas);
  flagDisplay.link(world);
  window.setInterval(() => {
    flagDisplay.renderViewDebug(RedrawMode.FLAGS);
  }, 100);
}

// world.requestChunkLoad(1, 1);
// mainDisplay.requestChunkRedraw(new NPoint(1, 1));

world.startTickLoop(30);

mainDisplay.startDrawLoop();
// window.setInterval(() => {
//   mainDisplay.debugRender("shader");
// }, 100);
