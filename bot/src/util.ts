export function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export function log(msg: string) {
	console.log(`[${new Date().toISOString()}] ${msg}`);
}

export function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(arr: any[]) {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}
