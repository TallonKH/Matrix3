import { Chunk, World, WorldGenerator, BlockType, densityConstant, updateStatic } from "./base";
import GridDisplay, { BlockShaderFactorMap } from "./display";
import { Color } from "./library";
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
    this.typeA = this.world.getBlockTypeIndex("water") ?? 0;
    this.typeB = this.world.getBlockTypeIndex("water") ?? 0;
    this.typeC = this.world.getBlockTypeIndex("stone") ?? 0;
    this.typeD = this.world.getBlockTypeIndex("water") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, x: number, y: number, chunk: Chunk): void {
    const grid = chunk.getBlockTypes();
    grid.fill((x & 1) ^ (y & 1) ? ((y & 2) ^ (x & 2) ? this.typeC : this.typeA) : ((y & 5) ^ (x & 3) ? this.typeD : this.typeB));
  }
}

// registering blocks
const shaderData: Map<string, BlockShaderFactorMap> = new Map();

const bt_air = new BlockType({
  name: "air",
  color: new Color(0.9, 0.95, 1),
  densityFunc: densityConstant(10),
  tickBehaviorGen: () => updateFlow(1, updateStatic),
});
shaderData.set("air", {
  min: new Color(0.9, 0.95, 1),
  max: new Color(0.9, 0.95, 1),
});

const bt_cobble = new BlockType({
  name: "gravel",
  color: new Color(0.4, 0.4, 0.4),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateCrumble(updateStatic),
});
shaderData.set("gravel", {
  min: new Color(0.35, 0.32, 0.32),
  max: new Color(0.47, 0.47, 0.47),
});

const bt_stone = new BlockType({
  name: "stone",
  color: new Color(0.5, 0.5, 0.5),
  densityFunc: densityConstant(200),
  tickBehaviorGen: () => updateStatic,
});
shaderData.set("stone", {
  min: new Color(0.46, 0.46, 0.46),
  max: new Color(0.55, 0.55, 0.55),
  randFactor: 1,
  // randFactor: 0.4,
  // noise1Factor: 0.3,
  // noise1ScaleX: 0.05,
  // noise1ScaleY: 0.1,
  // noise2Factor: 0.3,
  // noise2ScaleX: 0.5,
  // noise2ScaleY: 0.5,
});

const bt_water = new BlockType({
  name: "water",
  color: new Color(0.4, 0.4, 0.4),
  densityFunc: densityConstant(100),
  tickBehaviorGen: () => updateFlow(0.8, updateStatic),
});
shaderData.set("water", {
  min: new Color(0.23, 0.47, 0.97),
  max: new Color(0.25, 0.55, 1),
  randFactor: 0.5,
  timeFactor: 0.5,
  timeOffsetFactor: 1,
  timeScale: 0.05,
  // noise1Factor: 0.6,
  // noise1ScaleX: 0.05,
  // noise1ScaleY: 0.1,
  // noise1ScaleTime: 0.015,
  // noise2Factor: 0.2,
  // noise2ScaleX: 0.5,
  // noise2ScaleY: 0.5,
  // noise2ScaleTime: 0.1,
});

const world = new World((w: World) => new CheckerGen(w));
world.registerBlockType(bt_air);
world.registerBlockType(bt_cobble);
world.registerBlockType(bt_stone);
world.registerBlockType(bt_water);
world.init();

const a = false;
const container = document.getElementById("inner-container");
if (container === null) {
  throw "no container";
}

const mainDisplay = new GridDisplay();
mainDisplay.canvas.style.height = "100%";
mainDisplay.canvas.style.width = "100%";
mainDisplay.canvas.style.border = "2px solid black";
// mainDisplay.canvas.style.background = "linear-gradient(0deg, #0F0 0%, #040 100%)";
container.appendChild(mainDisplay.canvas);
mainDisplay.link(world);
for (const shader of shaderData) {
  mainDisplay.registerBlockShader(shader[0], shader[1]);
}

world.startTickLoop(30);

mainDisplay.startDrawLoop();

let leftKeyDown = false;
let rightKeyDown = false;
let upKeyDown = false;
let downKeyDown = false;
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowLeft":
      leftKeyDown = true;
      break;
    case "ArrowRight":
      rightKeyDown = true;
      break;
    case "ArrowUp":
      upKeyDown = true;
      break;
    case "ArrowDown":
      downKeyDown = true;
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowLeft":
      leftKeyDown = false;
      break;
    case "ArrowRight":
      rightKeyDown = false;
      break;
    case "ArrowUp":
      upKeyDown = false;
      break;
    case "ArrowDown":
      downKeyDown = false;
      break;
  }
});

const panSpeed = -100;
window.setInterval(() => {
  if (leftKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(-panSpeed, 0));
  }
  if (rightKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(panSpeed, 0));
  }
  if (upKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, -panSpeed));
  }
  if (downKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, panSpeed));
  }
}, (1000 / 20));