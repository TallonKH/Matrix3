import { Chunk, CHUNK_SIZE2, World, WorldGenerator, BlockId, BlockType, shaderLerp, UpdateFlags, CHUNK_MODMASK, CHUNK_BITSHIFT } from "./base";
import GridDisplay from "./display";
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
    this.typeC = this.world.getBlockTypeIndex("updatium") ?? 0;
    return (this.typeA !== 0 && this.typeB !== 0);
  }

  public generate(_world: World, x: number, y: number): Chunk {
    const grid = new Uint16Array(CHUNK_SIZE2);
    grid.fill(((x === 1) && (y === 1)) ? this.typeB : this.typeC);
    // grid.fill(this.typeA);
    // // if(x === 1 && y === 1){
    //   // grid[~~(Math.random() * CHUNK_SIZE2)] = this.typeB;
    //   grid[0] = this.typeB;
      // 
    // }
    // for (let i = 0; i < 1; i++) {
    // }
    return new Chunk(x, y, grid);
  }
}

const bt_air = new BlockType({
  name: "air",
  color: new Color(0.9, 0.95, 1),
  tickBehaviorGen: (world_init) => {
    const airId = world_init.getBlockTypeIndex("stone") ?? 0;
    return (world, chunk, i) => {
      // chunk.forEachNeighbor(i & CHUNK_MODMASK, i >> CHUNK_BITSHIFT, (c,j) => world.setBlockTypeNew(c,j,airId), false);
      // world.setBlockTypeMutate(chunk, i, airId);
    };
  },
});

const bt_stone = new BlockType({
  name: "stone",
  color: new Color(0.4, 0.4, 0.4),
  shader: shaderLerp(new Color(0.35, 0.35, 0.35), new Color(0.45, 0.45, 0.45)),
  tickBehaviorGen: (world_init) => {
    const nextType = world_init.getBlockTypeIndex("stone") ?? 0;
    return (world, chunk, i) => {
      // world.setBlockTypeMutate(chunk, i, nextType);
      // chunk.forEachNeighbor(i & CHUNK_MODMASK, i >> CHUNK_BITSHIFT, (c,j) => world.setBlockTypeNew(c,j,airId), false);
      // console.log(i + " : " + c2i2);

      let c2i2 = chunk.getNearIndex((i & CHUNK_MODMASK) + 1, (i >> CHUNK_BITSHIFT));
      if(c2i2 !== null && c2i2[0].getBlockType(c2i2[1]) !== nextType){
        world.setBlockTypeNew(c2i2[0], c2i2[1], nextType);
      }
      c2i2 = chunk.getNearIndex((i & CHUNK_MODMASK) - 1, (i >> CHUNK_BITSHIFT));
      if(c2i2 !== null && c2i2[0].getBlockType(c2i2[1]) !== nextType){
        world.setBlockTypeNew(c2i2[0], c2i2[1], nextType);
      }
      c2i2 = chunk.getNearIndex((i & CHUNK_MODMASK), (i >> CHUNK_BITSHIFT) + 1);
      if(c2i2 !== null && c2i2[0].getBlockType(c2i2[1]) !== nextType){
        world.setBlockTypeNew(c2i2[0], c2i2[1], nextType);
      }
      c2i2 = chunk.getNearIndex((i & CHUNK_MODMASK), (i >> CHUNK_BITSHIFT) - 1);
      if(c2i2 !== null && c2i2[0].getBlockType(c2i2[1]) !== nextType){
        world.setBlockTypeNew(c2i2[0], c2i2[1], nextType);
      }
    };
  },
});

const bt_updatium = new BlockType({
  name: "updatium",
  color: new Color(0.4, 0.4, 0.4),
  shader: (_, chunk, i, x, y) => chunk.getFlag(i, UpdateFlags.PENDING_TICK) ? new Color(0, 1, 0) : new Color(1, 0, 0),
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
  flagDisplay.debugRender("flags");
}, 100);