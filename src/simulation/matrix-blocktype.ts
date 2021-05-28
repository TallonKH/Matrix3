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
  tags?: Array<string>,
  numbers?: Array<[string, number]>,
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

  private readonly tags: Set<string> = new Set();
  private readonly numbers: Map<string, number> = new Map();
  private densityFunc: DensityFunc;
  private initialized = false;

  constructor({ name, color, tickBehaviorGen, randomTickBehaviorGen, heatedBehaviorGen, densityFunc, tags, numbers }: BlockTypeArgs) {
    this.name = name;
    this.color = color;
    this.tickBehaviorGen = tickBehaviorGen;
    this.tickBehavior = updateStatic;
    this.randomTickBehaviorGen = randomTickBehaviorGen;
    this.randomTickBehavior = updateStatic;
    this.heatedBehaviorGen = heatedBehaviorGen;
    this.heatedBehavior = updateStatic;
    this.densityFunc = densityFunc ?? densityConstant(255);
    tags?.forEach((tag) => this.tags.add(tag));
    numbers?.forEach(([k, v]) => this.numbers.set(k, v));
  }

  public hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  public getNumber(name: string): number | undefined{
    return this.numbers.get(name);
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