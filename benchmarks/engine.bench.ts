import { performance } from "perf_hooks";
import { resetState, placeOrder, cancelOrder } from "../engine/tests/utils";
import { getDepth } from "../engine/src/modules/orderbook";

const N = 1000;

function stats(times: number[]) {
	times.sort((a, b) => a - b);
	const sum = times.reduce((a, b) => a + b, 0);
	const avg = sum / times.length;
	const p50 = times[Math.floor(times.length * 0.5)];
	const p95 = times[Math.floor(times.length * 0.95)];
	const p99 = times[Math.floor(times.length * 0.99)];
	return { avg, p50, p95, p99, total: sum };
}

function report(name: string, times: number[]) {
	const s = stats(times);
	const opsPerSec = (times.length / s.total) * 1000;
	console.log(`  ${name}`);
	console.log(`    ${times.length} ops in ${s.total.toFixed(0)}ms`);
	console.log(
		`    ${opsPerSec.toFixed(0)} ops/sec | avg ${s.avg.toFixed(2)}ms | p50 ${s.p50?.toFixed(2)}ms | p95 ${s.p95?.toFixed(2)}ms | p99 ${s.p99?.toFixed(2)}ms`,
	);
}

async function benchLimitNoMatch() {
	resetState();
	const times: number[] = [];

	for (let i = 0; i < N; i++) {
		const start = performance.now();
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "1",
			side: "BUY",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 60000n,
			qty: 100n,
		});
		times.push(performance.now() - start);
	}

	report("Limit order (no match)", times);
}

async function benchLimitMatch() {
	resetState();
	const times: number[] = [];

	// Seed resting asks
	for (let i = 0; i < N; i++) {
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "1",
			side: "SELL",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 60000n + BigInt(i % 10),
			qty: 100n,
		});
	}

	// Cross with buys
	for (let i = 0; i < N; i++) {
		const start = performance.now();
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "2",
			side: "BUY",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 60000n + BigInt(i % 10),
			qty: 100n,
		});
		times.push(performance.now() - start);
	}

	report("Limit order (with match)", times);
}

async function benchMarketOrder() {
	resetState();
	const times: number[] = [];

	// Seed resting asks
	for (let i = 0; i < N; i++) {
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "1",
			side: "SELL",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 60000n,
			qty: 100n,
		});
	}

	for (let i = 0; i < N; i++) {
		const start = performance.now();
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "2",
			side: "BUY",
			type: "MARKET",
			symbol: "BTC_USD",
			price: null,
			qty: 100n,
		});
		times.push(performance.now() - start);
	}

	report("Market order", times);
}

async function benchGetDepth() {
	resetState();

	// Populate book
	for (let i = 0; i < 50; i++) {
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "1",
			side: "SELL",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 60000n + BigInt(i),
			qty: 100n,
		});
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "2",
			side: "BUY",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 59999n - BigInt(i),
			qty: 100n,
		});
	}

	const times: number[] = [];
	for (let i = 0; i < N * 5; i++) {
		const start = performance.now();
		await getDepth("BTC_USD");
		times.push(performance.now() - start);
	}

	report("getDepth (100 levels each side)", times);
}

async function benchCancelOrder() {
	resetState();
	const times: number[] = [];
	const ids: string[] = [];

	// Place orders
	for (let i = 0; i < N; i++) {
		const id = crypto.randomUUID();
		await placeOrder({
			id,
			userId: "1",
			side: "BUY",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 50000n + BigInt(i),
			qty: 100n,
		});
		ids.push(id);
	}

	// Cancel them
	for (const id of ids) {
		const start = performance.now();
		await cancelOrder("1", id);
		times.push(performance.now() - start);
	}

	report("cancelOrder", times);
}

console.log("=== Engine Benchmarks ===\n");

await benchLimitNoMatch();
console.log();
await benchLimitMatch();
console.log();
await benchMarketOrder();
console.log();
await benchGetDepth();
console.log();
await benchCancelOrder();
console.log();
