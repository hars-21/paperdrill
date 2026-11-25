export function bigintReplacer(_key: string, value: unknown) {
	return typeof value === "bigint" ? value.toString() : value;
}

export function redisTtlSecondsFromMs(ms: number) {
	return Math.max(1, Math.ceil(ms / 1000));
}
