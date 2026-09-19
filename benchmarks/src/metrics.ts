import { performance } from "node:perf_hooks";

interface LoadOptions {
	total: number;
	concurrency: number;
	operation: (index: number) => Promise<boolean>;
}

export interface LoadResult {
	total: number;
	succeeded: number;
	failed: number;
	elapsedMs: number;
	operationsPerSecond: number;
	p95Ms: number;
}

export function percentile(samples: number[], value: number): number {
	if (samples.length === 0) return 0;
	const sorted = samples.toSorted((a, b) => a - b);
	const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1);
	return sorted[Math.max(0, index)] ?? 0;
}

export async function runLoad(options: LoadOptions): Promise<LoadResult> {
	const latencies: number[] = [];
	let nextIndex = 0;
	let succeeded = 0;
	let failed = 0;
	const startedAt = performance.now();

	async function worker() {
		for (;;) {
			const index = nextIndex++;
			if (index >= options.total) return;

			const requestStartedAt = performance.now();
			try {
				if (await options.operation(index)) succeeded++;
				else failed++;
			} catch {
				failed++;
			}
			latencies.push(performance.now() - requestStartedAt);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(options.concurrency, options.total) }, () => worker()),
	);

	const elapsedMs = performance.now() - startedAt;
	return {
		total: options.total,
		succeeded,
		failed,
		elapsedMs,
		operationsPerSecond: (succeeded / elapsedMs) * 1000,
		p95Ms: percentile(latencies, 0.95),
	};
}

export function printLoad(label: string, result: LoadResult, unit = "orders") {
	console.log(`\n${label}`);
	console.log(
		`  ${result.succeeded}/${result.total} succeeded | ${result.operationsPerSecond.toFixed(0)} ${unit}/sec | p95 ${result.p95Ms.toFixed(1)} ms`,
	);
}

export function requireSuccessful(label: string, result: LoadResult) {
	if (result.failed > 0) {
		throw new Error(`${label} failed ${result.failed} of ${result.total} operations`);
	}
}
