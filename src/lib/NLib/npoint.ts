import {
	clamp,
	lerp
} from "./nmath";

export type PointStr = string;

export class NPoint {
	public readonly x: number;
	public readonly y: number;

	constructor(x = 0, y: number | null = null) {
		this.x = x;
		this.y = (y === null) ? x : y;
		Object.freeze(this);
	}

	clamp1(mag: number): NPoint {
		return new NPoint(
			clamp(this.x, -mag, mag),
			clamp(this.y, -mag, mag)
		);
	}

	clamp2(min: number, max: number): NPoint {
		return new NPoint(
			clamp(this.x, min, max),
			clamp(this.y, min, max)
		);
	}

	clamp4(minX: number, maxX: number, minY: number, maxY: number): NPoint {
		return new NPoint(
			clamp(this.x, minX, maxX),
			clamp(this.y, minY, maxY)
		);
	}

	clamp1p(mag: NPoint): NPoint {
		return new NPoint(
			clamp(this.x, -mag.x, mag.x),
			clamp(this.y, -mag.y, mag.y)
		);
	}

	clamp2p(min: NPoint, max: NPoint): NPoint {
		return new NPoint(
			clamp(this.x, min.x, max.x),
			clamp(this.y, min.y, max.y)
		);
	}

	toHash(): PointStr {
		return this.x + ":" + this.y;
	}

	static toHash(x: number, y:number): PointStr {
		return x + ":" + y;
	}

	toString(floatDigits = 3): string {
		return `(${this.x.toFixed(floatDigits)}, ${this.y.toFixed(floatDigits)})`;
	}

	operate(func: (c: number, pt: NPoint) => number): NPoint {
		return new NPoint(
			func(this.x, this),
			func(this.y, this)
		);
	}

	static cooperate(func: (a: number, b: number, ptA: NPoint, ptB: NPoint) => number, a: NPoint, b: NPoint): NPoint {
		return new NPoint(
			func(a.x, b.x, a, b),
			func(a.y, b.y, a, b)
		);
	}

	static noperate(func: (cs: Iterable<number>) => number, points: Array<NPoint>): NPoint {
		if (points.length == 0) {
			return ZERO;
		}

		return new NPoint(
			func(points.map(p => p.x)),
			func(points.map(p => p.y))
		);
	}

	static sum(points: Iterable<NPoint>): NPoint {
		let x = 0;
		let y = 0;
		for (const point of points) {
			x += point.x;
			y += point.y;
		}
		return new NPoint(x, y);
	}

	static product(points: Iterable<NPoint>): NPoint {
		let x = 1;
		let y = 1;
		for (const point of points) {
			x *= point.x;
			y *= point.y;
		}
		return new NPoint(x, y);
	}

	add1(other: number): NPoint {
		return new NPoint(this.x + other, this.y + other);
	}

	add2(x: number, y: number): NPoint {
		return new NPoint(this.x + x, this.y + y);
	}

	addp(other: NPoint): NPoint {
		return new NPoint(this.x + other.x, this.y + other.y);
	}

	subtract1(other: number): NPoint {
		return new NPoint(this.x - other, this.y - other);
	}

	subtract2(x: number, y: number): NPoint {
		return new NPoint(this.x - x, this.y - y);
	}

	subtractp(other: NPoint): NPoint {
		return new NPoint(this.x - other.x, this.y - other.y);
	}

	multiply1(other: number): NPoint {
		return new NPoint(this.x * other, this.y * other);
	}

	multiply2(x: number, y: number): NPoint {
		return new NPoint(this.x * x, this.y * y);
	}

	multiplyp(other: NPoint): NPoint {
		return new NPoint(this.x * other.x, this.y * other.y);
	}

	divide1(other: number): NPoint {
		return new NPoint(this.x / other, this.y / other);
	}

	divide2(x: number, y: number): NPoint {
		return new NPoint(this.x / x, this.y / y);
	}

	dividep(other: NPoint): NPoint {
		return new NPoint(this.x / other.x, this.y / other.y);
	}

	min1(other: number): NPoint {
		return new NPoint(Math.min(this.x, other), Math.min(this.y, other));
	}

	min2(x: number, y: number): NPoint {
		return new NPoint(Math.min(this.x, x), Math.min(this.y, y));
	}

	minp(other: NPoint): NPoint {
		return new NPoint(Math.min(this.x, other.x), Math.min(this.y, other.y));
	}

	max1(other: number): NPoint {
		return new NPoint(Math.max(this.x, other), Math.max(this.y, other));
	}

	max2(x: number, y: number): NPoint {
		return new NPoint(Math.max(this.x, x), Math.max(this.y, y));
	}

	maxp(other: NPoint): NPoint {
		return new NPoint(Math.max(this.x, other.x), Math.max(this.y, other.y));
	}

	negate(): NPoint {
		return new NPoint(-this.x, -this.y);
	}

	round(n = 0): NPoint {
		if (n !== 0) {
			const factor = Math.pow(10, n);
			return new NPoint(Math.round(this.x * factor) / factor, Math.round(this.y * factor) / factor);
		} else {
			return new NPoint(Math.round(this.x), Math.round(this.y));
		}
	}

	floor(): NPoint {
		return new NPoint(Math.floor(this.x), Math.floor(this.y));
	}

	ceil(): NPoint {
		return new NPoint(Math.ceil(this.x), Math.ceil(this.y));
	}

	addComponents(): number {
		return this.x + this.y;
	}

	lengthSquared(): number {
		return this.x * this.x + this.y * this.y;
	}

	length(): number {
		return Math.sqrt(this.lengthSquared());
	}

	normalized(): NPoint {
		return this.divide1(this.length());
	}

	lesser(): number {
		return Math.min(this.x, this.y);
	}

	greater(): number {
		return Math.max(this.x, this.y);
	}

	copy(): NPoint {
		return new NPoint(this.x, this.y);
	}

	mirrorX(): NPoint {
		return new NPoint(-this.x, this.y);
	}

	mirrorY(): NPoint {
		return new NPoint(this.x, -this.y);
	}

	*mirrors(): Iterator<NPoint> {
		yield this.copy();
		yield this.mirrorX();
		yield this.negate();
		yield this.mirrorY();
	}

	reflect(normal: NPoint): NPoint {
		return this.subtractp(normal.multiply1(NPoint.dotProduct(this, normal) * 2));
	}

	project(tangent: NPoint): NPoint {
		const normTan = tangent.normalized();
		return normTan.multiply1(NPoint.dotProduct(this, normTan));
	}

	reject(tangent: NPoint): NPoint {
		return this.subtractp(this.project(tangent));
	}

	withinRect(cornerA: NPoint, cornerB: NPoint|null = null): boolean {
		if (cornerB === null) {
			const mx = Math.abs(cornerA.x);
			const my = Math.abs(cornerA.y);
			return (this.x <= mx) && (this.x >= -mx) && (this.y <= my) && (this.y >= -my);
		}

		const lc = NPoint.min(cornerA, cornerB);
		const gc = NPoint.max(cornerA, cornerB);
		return (this.x <= gc.x) && (this.x >= lc.x) && (this.y <= gc.y) && (this.y >= lc.y);
	}

	rotate(rads: number): NPoint {
		const prevRads = this.getAngle();
		const mag = this.length();
		return new NPoint(Math.cos(rads + prevRads) * mag, Math.sin(rads + prevRads) * mag);
	}

	getAngle(): number {
		return Math.atan2(this.y, this.x);
	}

	rotateAxis(rads: number, axis: NPoint): NPoint {
		return this.subtractp(axis).rotate(rads).addp(axis);
	}

	static distSquared(a: NPoint, b: NPoint): number {
		return a.subtractp(b).lengthSquared();
	}

	static dist(a: NPoint, b: NPoint): number {
		return a.subtractp(b).length();
	}

	static fromAngle(rads: number): NPoint {
		return new NPoint(Math.cos(rads), Math.sin(rads));
	}

	nearest(points: Array<NPoint>): { point: NPoint, index: number, distSq: number } {
		let shortestDistSq = NPoint.distSquared(this, points[0]);
		let bestIndex = 0;
		for (let i = 1; i < points.length; i++) {
			const currentDistSq = NPoint.distSquared(this, points[i]);
			if (currentDistSq < shortestDistSq) {
				bestIndex = i;
				shortestDistSq = currentDistSq;
			}
		}
		return {
			index: bestIndex,
			distSq: shortestDistSq,
			point: points[bestIndex],
		};
	}

	distToSegmentSquared(v: NPoint, w: NPoint): number {
		const l2 = NPoint.distSquared(v, w);
		if (l2 === 0) {
			return NPoint.distSquared(this, v);
		}
		const t = clamp(NPoint.dotProduct(v.subtractp(this), v.subtractp(w)) / l2, 0, 1);
		return NPoint.distSquared(this, w.subtractp(v).multiply1(t).addp(v));
	}

	distToSegment(v: NPoint, w: NPoint): number {
		return Math.sqrt(this.distToSegmentSquared(v, w));
	}

	equals(other: NPoint): boolean {
		return this.x === other.x && this.y === other.y;
	}

	nearlyEqual(other: NPoint, threshold = 0.0001): boolean {
		return Math.abs(this.x - other.x) <= threshold && Math.abs(this.y - other.y) <= threshold;
	}

	static lerp(a: NPoint, b: NPoint, factor: number): NPoint {
		return new NPoint(
			lerp(a.x, b.x, factor),
			lerp(a.y, b.y, factor)
		);
	}

	static same(...pts: Array<NPoint>): boolean {
		const x = pts[0].x;
		const y = pts[0].y;
		for (let i = 1, l = pts.length; i < l; i++) {
			const pt = pts[i];
			if (x !== pt.x || y !== pt.y) {
				return false;
			}
		}
		return true;
	}

	static min(...pts: Array<NPoint>): NPoint {
		return new NPoint(Math.min(...pts.map(pt => pt.x)), Math.min(...pts.map(pt => pt.y)));
	}

	static max(...pts: Array<NPoint>): NPoint {
		return new NPoint(Math.max(...pts.map(pt => pt.x)), Math.max(...pts.map(pt => pt.y)));
	}

	static dotProduct(a: NPoint, b: NPoint): number {
		return a.x * b.x + a.y * b.y;
	}

	static crossProduct(a: NPoint, b: NPoint): number {
		return a.x * b.y - a.y * b.x;
	}

	static segmentIntersection(a1: NPoint, a2: NPoint, b1: NPoint, b2: NPoint): boolean {
		const dxa = (a2.x - a1.x);
		const dxb = (b2.x - b1.x);

		if (dxa === 0 && dxb === 0) {
			return false;
		}

		const minA = NPoint.min(a1, a2);
		const maxA = NPoint.max(a1, a2);
		const minB = NPoint.min(b1, b2);
		const maxB = NPoint.max(b1, b2);

		if (dxa === 0) {
			if (minB.x > a1.x || maxB.x < a1.x) {
				return false;
			}
			const mb = (b2.y - b1.y) / dxb;
			const bb = b1.y - (mb * b1.x);
			const interY = (mb * a1.x) + bb;
			return interY >= minA.y && interY <= maxA.y && interY >= minB.y && interY <= maxB.y;
		} else if (dxb === 0) {
			if (minA.x > b1.x || maxA.x < b1.x) {
				return false;
			}
			const ma = (a2.y - a1.y) / dxa;
			const ba = a1.y - (ma * a1.x);
			const interY = (ma * b1.x) + ba;
			return interY >= minA.y && interY <= maxA.y && interY >= minB.y && interY <= maxB.y;
		} else {
			const ma = (a2.y - a1.y) / dxa;
			const ba = a1.y - (ma * a1.x);

			const mb = (b2.y - b1.y) / dxb;
			const bb = b1.y - (mb * b1.x);

			if (ma === mb) {
				return false;
			}

			const interX = (bb - ba) / (ma - mb);
			const interY = (ma * interX) + ba;
			return interX >= minA.x && interX <= maxA.x && interY >= minA.y && interY <= maxA.y && interX >= minB.x && interX <= maxB.x && interY >= minB.y && interY <= maxB.y;
		}
	}

	static getPointOnBezier(p1: NPoint, p2: NPoint, p3: NPoint, p4: NPoint, t: number): NPoint {
		const omt = 1 - t;
		const omt2 = omt * omt;
		const t2 = t * t;

		const coeff1 = omt2 * omt;
		const coeff2 = 3 * t * omt2;
		const coeff3 = 3 * t2 * omt;
		const coeff4 = t2 * t;

		const curveX = p1.x * coeff1 + p2.x * coeff2 + p3.x * coeff3 + p4.x * coeff4;
		const curveY = p1.y * coeff1 + p2.y * coeff2 + p3.y * coeff3 + p4.y * coeff4;
		return new NPoint(curveX, curveY);
	}
}

export const ZERO: NPoint = new NPoint(0, 0);
export const LEFT: NPoint = new NPoint(-1, 0);
export const RIGHT: NPoint = new NPoint(1, 0);
export const UP: NPoint = new NPoint(0, 1);
export const DOWN: NPoint = new NPoint(0, -1);
export const DOWN_LEFT: NPoint = new NPoint(-1, -1);
export const DOWN_RIGHT: NPoint = new NPoint(1, -1);
export const UP_LEFT: NPoint = new NPoint(-1, 1);
export const UP_RIGHT: NPoint = new NPoint(1, 1);