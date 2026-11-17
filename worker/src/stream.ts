function parseStreamId(id: string) {
	const separator = id.indexOf("-");
	if (separator < 0) return null;

	try {
		return {
			milliseconds: BigInt(id.slice(0, separator)),
			sequence: BigInt(id.slice(separator + 1)),
		};
	} catch {
		return null;
	}
}

export function compareStreamIds(a: string, b: string): number {
	const left = parseStreamId(a);
	const right = parseStreamId(b);

	if (!left || !right) return a.localeCompare(b);
	if (left.milliseconds !== right.milliseconds) {
		return left.milliseconds < right.milliseconds ? -1 : 1;
	}
	if (left.sequence !== right.sequence) {
		return left.sequence < right.sequence ? -1 : 1;
	}
	return 0;
}

export function maxStreamId(a: string | null, b: string): string {
	if (!a) return b;
	return compareStreamIds(a, b) >= 0 ? a : b;
}
