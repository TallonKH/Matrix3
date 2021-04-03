export function floorMod(a: number, b: number): number {
	return ((a % b) + b) % b;
}

export function clamp(a: number, min = 0.0, max = 1.0): number {
	return Math.min(Math.max(min, a), max);
}

/** clamps a between -b and b */
export function absMin(a: number, b: number): number {
	return clamp(a, -b, b);
}

/** linear interpolate from a to b */
export function lerp(a: number, b: number, factor: number): number {
	return b * factor + a * (1 - factor);
}

export function step(edge: number, value: number): number {
	return value < edge ? 0 : 1;
}

export function smoothStep(minEdge: number, maxEdge: number, value: number, easingFunc = easeHermite): number {
	return easingFunc(clamp(value, minEdge, maxEdge) / (maxEdge - minEdge));
}


type EasingFunc = (x: number) => number;

export const easingFuncs: Map<string, EasingFunc> = new Map<string, EasingFunc>(
	[["linear", easeLinear],
	["hermite", easeHermite],
	["quadratic", easeQuadratic],
	["cubic", easeCubic],
	["sine", easeSine]]
);

export function ease(x: number, methodName: string): number {
	return easingFuncs.get(methodName)(x);
}

export function easeLinear(x: number): number {
	return x;
}

export function easeHermite(x: number): number {
	return x * x * (3 - 2 * x);
}

export function easeQuadratic(x: number): number {
	return x < 0.5 ? (2 * x * x) : (1 - Math.pow(-2 * x + 2, 2) * 0.5);
}

export function easeCubic(x: number): number {
	return x < 0.5 ? (4 * x * x * x) : (1 - Math.pow(-2 * x + 2, 3) * 0.5);
}

export function easeSine(x: number): number {
	return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function average(values: Iterable<number>): number {
	let sum = 0;
	let i = 0;
	for (const n of values) {
		sum += n;
		i++;
	}
	return sum / i;
}

export function gaussianGenerator(mean: number, stdev: number): number {
	let y2: number;
	let use_last = false;
	return (() => {
		let y1;
		if (use_last) {
			y1 = y2;
			use_last = false;
		} else {
			let x1, x2, w;
			do {
				x1 = 2.0 * Math.random() - 1.0;
				x2 = 2.0 * Math.random() - 1.0;
				w = x1 * x1 + x2 * x2;
			} while (w >= 1.0);
			w = Math.sqrt((-2.0 * Math.log(w)) / w);
			y1 = x1 * w;
			y2 = x2 * w;
			use_last = true;
		}

		const retval = mean + stdev * y1;
		if (retval > 0)
			return retval;
		return -retval;
	})();
}

const degRadConst = Math.PI / 180;
export function toRads(degs: number): number {
	return degs * degRadConst;
}

const radDegConst = 180 / Math.PI;
export function toDegrees(rads: number): number {
	return rads * radDegConst;
}