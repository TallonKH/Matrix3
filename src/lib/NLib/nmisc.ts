type CompareFunc<T> = (a: T, b: T) => number;

export function identity<T>(a: T): T {
	return a;
}

/** true if, for every i, a[i] === b[i] */
export function arraysSame<T>(a: Array<T>, b: Array<T>): boolean {
	if (a === null || b === null) {
		return false;
	}

	if (a.length != b.length) {
		return false;
	}

	for (let i = 0, l = a.length; i < l; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

export function findSorted<T>(array: Array<T>, item: T, compareFunc: CompareFunc<T>): number {
	let min = 0;
	let max = array.length;
	let mid;
	let midItem;
	while (true) {
		// (a >> 1) is faster than Math.floor(a * 0.5)
		mid = (min + max) >> 1;
		if (min >= max) {
			return -1;
		}

		midItem = array[mid];
		const diff = compareFunc(midItem, item);
		if (diff === 0) {
			return mid;
		}
		if (diff > 0) {
			max = mid;
			continue;
		} else {
			min = mid + 1;
			continue;
		}
	}
}

export function removeSorted<T>(array: Array<T>, item: T, compareFunc: (a: T, b: T) => number): number {
	const found = findSorted(array, item, compareFunc);
	if (found >= 0) {
		array.splice(found, 1);
	}
	return found;
}

export function insertSorted<T>(array: Array<T>, item: T, compareFunc: (a: T, b: T) => number): number {
	let min = 0;
	let max = array.length;
	let mid;
	let midItem;
	while (true) {
		// (a >> 1) is faster than Math.floor(a * 0.5)
		mid = (min + max) >> 1;

		if (min >= max) {
			array.splice(max, 0, item);
			return max;
		}

		midItem = array[mid];
		const diff = compareFunc(midItem, item);

		if (diff === 0) {
			array.splice(mid, 0, item);
			return mid;
		}

		if (diff > 0) {
			max = mid;
			continue;
		} else {
			min = mid + 1;
			continue;
		}
	}
}

export function compose<T>(...funcs: Array<(a: T) => T>): (a: T) => T {
	let existing = funcs[0];
	for (let i = 1, l = funcs.length; i < l; i++) {
		const current = funcs[i];
		existing = val => current(existing(val));
	}
	return existing;
}

export function getRand<T>(array: Array<T>): T {
	// ~~ is a bitwise version of Math.floor
	return array[~~(Math.random() * array.length)];
}

export function allEqual<T>(...ls: Array<T>): boolean {
	if (ls.length === 0) {
		return true;
	}
	const a = ls[0];
	for (const b of ls) {
		if (a !== b) {
			return false;
		}
	}
	return true;
}


export function popRand<T>(array: Array<T>): T {
	// ~~ is a bitwise version of Math.floor
	const i = ~~(Math.random() * array.length);
	const result = array[i];
	array.splice(i, 1);
	return result;
}

export function getDivPosition(div: HTMLElement): { x: number, y: number } {
	const rect = div.getBoundingClientRect();
	return {
		"x": rect.left,
		"y": rect.top
	};
}

export function getDivCenter(div: HTMLElement): { x: number, y: number } {
	const rect = div.getBoundingClientRect();
	return {
		"x": (rect.left + rect.right) / 2,
		"y": (rect.top + rect.bottom) / 2
	};
}

export function shallowStringify(obj: any, maxDepth: number, depth = 0): string {
	const type = typeof obj;
	switch (type) {
		case "string":
			return obj;
		case "number":
			return obj.toString();
		default:
			if (depth < maxDepth) {
				return "{" +
					Object.keys(obj).map(
						key => (
							shallowStringify(key, maxDepth, depth + 1) + ":" + shallowStringify(obj[key], maxDepth, depth + 1)
						)
					).join(", ") + "}";
			} else {
				return type;
			}
	}
}

export function saveCanvas(canvas: HTMLCanvasElement, name: string): void {
	const link = document.createElement("a");
	link.setAttribute("download", name + ".png");
	link.setAttribute("href", canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
	link.click();
}

export function currentTimeMillis(): number {
	return (new Date()).getTime();
}

export function downloadFile(filename: string, text: string): void {
	const link = document.createElement("a");
	link.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
	link.setAttribute("download", filename);

	link.style.display = "none";
	document.body.appendChild(link);
	link.click();
	link.remove();
}

// by stackoverflow user 4815056
export function getOS(): string {
	const userAgent = window.navigator.userAgent;
	const platform = window.navigator.platform;
	const macosPlatforms = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"];
	const windowsPlatforms = ["Win32", "Win64", "Windows", "WinCE"];
	const iosPlatforms = ["iPhone", "iPad", "iPod"];

	if (macosPlatforms.indexOf(platform) !== -1) {
		return "Mac";
	}
	if (iosPlatforms.indexOf(platform) !== -1) {
		return "iOS";
	}
	if (windowsPlatforms.indexOf(platform) !== -1) {
		return "Windows";
	}
	if (/Android/.test(userAgent)) {
		return "Android";
	}
	if (/Linux/.test(platform)) {
		return "Linux";
	}
	return "Unknown";
}

export function clearObj(obj: any): void {
	for (const key in obj) {
		delete obj[key];
	}
}