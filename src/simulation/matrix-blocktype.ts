import { Color } from "../library";
import Chunk from "./matrix-chunk";
import World from "./matrix-world";

// Block Tick Behavior
export type TickBehavior = (world: World, chunk: Chunk, index: number) => void;
// eslint-disable-next-line no-empty-function
export const updateStatic: TickBehavior = () => { };

// Block Density Function
export type DensityFunc = (world: World, chunk: Chunk, index: number) => number;
export const densityConstant: (val: number) => DensityFunc = (val) => (() => val);

interface BlockTypeArgs {
  name: string,
  color: Color,
  tickBehaviorGen?: (world: World) => TickBehavior,
  densityFunc?: DensityFunc,
}

export default class BlockType {
  public readonly name: string;
  public readonly color: Color;
  public readonly tickBehaviorGen?: (world: World) => TickBehavior;
  private tickBehavior: TickBehavior;
  private densityFunc: DensityFunc;
  private initialized = false;

  constructor({ name, color, tickBehaviorGen, densityFunc }: BlockTypeArgs) {
    this.name = name;
    this.color = color;
    this.tickBehaviorGen = tickBehaviorGen;
    this.tickBehavior = updateStatic;
    this.densityFunc = densityFunc ?? densityConstant(255);
  }

  public doTick: TickBehavior = (world: World, chunk: Chunk, index: number) => this.tickBehavior(world, chunk, index);

  public getDensity: DensityFunc = (world: World, chunk: Chunk, index: number) => this.densityFunc(world, chunk, index);

  public init(world: World): void {
    if (this.initialized) {
      throw "BlockType already initialized!";
    }

    this.initialized = true;
    if (this.tickBehaviorGen !== undefined) {
      this.tickBehavior = this.tickBehaviorGen(world);
    }
  }
}