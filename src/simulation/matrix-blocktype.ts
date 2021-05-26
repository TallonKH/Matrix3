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
  randomTickBehaviorGen?: (world: World) => TickBehavior,
  heatedBehaviorGen?: (world: World) => TickBehavior,
  densityFunc?: DensityFunc,
  acidResistance?: number,
  blastResistance?: number,
}

export default class BlockType {
  public readonly name: string;
  public readonly color: Color;
  
  public readonly tickBehaviorGen?: (world: World) => TickBehavior;
  private tickBehavior: TickBehavior;
  public readonly randomTickBehaviorGen?: (world: World) => TickBehavior;
  private randomTickBehavior: TickBehavior;
  public readonly heatedBehaviorGen?: (world: World) => TickBehavior;
  private heatedBehavior: TickBehavior;

  private densityFunc: DensityFunc;
  private initialized = false;
  public readonly acidResistance: number;
  public readonly blastResistance: number;

  constructor({ name, color, tickBehaviorGen, randomTickBehaviorGen, heatedBehaviorGen, densityFunc, acidResistance, blastResistance }: BlockTypeArgs) {
    this.name = name;
    this.color = color;
    this.tickBehaviorGen = tickBehaviorGen;
    this.tickBehavior = updateStatic;
    this.randomTickBehaviorGen = randomTickBehaviorGen;
    this.randomTickBehavior = updateStatic;
    this.heatedBehaviorGen = heatedBehaviorGen;
    this.heatedBehavior = updateStatic;
    this.densityFunc = densityFunc ?? densityConstant(255);
    this.acidResistance = acidResistance ?? 0.3;
    this.blastResistance = blastResistance ?? 0.3;
  }

  public doTick: TickBehavior = (world: World, chunk: Chunk, index: number) => this.tickBehavior(world, chunk, index);

  public doRandomTick: TickBehavior = (world: World, chunk: Chunk, index: number) => this.randomTickBehavior(world, chunk, index);

  public getDensity: DensityFunc = (world: World, chunk: Chunk, index: number) => this.densityFunc(world, chunk, index);

  public init(world: World): void {
    if (this.initialized) {
      throw "BlockType already initialized!";
    }

    this.initialized = true;
    if (this.tickBehaviorGen !== undefined) {
      this.tickBehavior = this.tickBehaviorGen(world);
    }
    if (this.randomTickBehaviorGen !== undefined) {
      this.randomTickBehavior = this.randomTickBehaviorGen(world);
    }
  }
}