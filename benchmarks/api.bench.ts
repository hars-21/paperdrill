import { performance } from "perf_hooks";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? "50", 10);
const DURATION_SEC = parseInt(process.env.DURATION_SEC ?? "10", 10);
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;
const SERVICE_EMAIL = process.env.SERVICE_EMAIL;

// --- Helpers ---

function stats(times: number[]) {
	if (times.length === 0) return { avg: 0, p50: 0, p95: 0, p99: 0, total: 0, count: 0 };
	times.sort((a, b) => a - b);
	const sum = times.reduce((a, b) => a + b, 0);
	const avg = sum / times.length;
	const p50 = times[Math.floor(times.length * 0.5)];
	const p95 = times[Math.floor(times.length * 0.95)];
	const p99 = times[Math.floor(times.length * 0.99)];
	return { avg, p50, p95, p99, total: sum, count: times.length };
}

function report(name: string, times: number[], errors: number) {
	const s = stats(times);
	const opsPerSec = s.total === 0 ? 0 : (s.count / s.total) * 1000;
	const errRate = ((errors / (s.count + errors)) * 100).toFixed(1);
	console.log(`  ${name}`);
	console.log(
		`    ${s.count} ok, ${errors} err (${errRate}% err) | ${(s.total / 1000).toFixed(1)}s`,
	);
	console.log(
		`    ${opsPerSec.toFixed(0)} req/sec | avg ${s.avg.toFixed(1)}ms | p50 ${s.p50?.toFixed(1)}ms | p95 ${s.p95?.toFixed(1)}ms | p99 ${s.p99?.toFixed(1)}ms`,
	);
}

type RequestFn = () => Promise<boolean>;

async function runLoadTest(name: string, fn: RequestFn, durationMs: number) {
	const times: number[] = [];
	let errors = 0;
	let running = true;

	const worker = async () => {
		while (running) {
			const start = performance.now();
			const ok = await fn();
			const elapsed = performance.now() - start;

			if (ok) {
				times.push(elapsed);
			} else {
				errors++;
			}
		}
	};

	const workers = Array.from({ length: CONCURRENCY }, () => worker());

	const deadline = setTimeout(() => {
		running = false;
	}, durationMs);

	await Promise.all(workers);
	clearTimeout(deadline);

	report(name, times, errors);
}

// --- Load test scenarios ---

async function benchMarkets() {
	await runLoadTest(
		"GET /v1/markets (public)",
		async () => {
			try {
				const res = await fetch(`${API_URL}/v1/markets`);
				return res.ok;
			} catch {
				return false;
			}
		},
		DURATION_SEC * 1000,
	);
}

async function benchOrderbook() {
	await runLoadTest(
		"GET /v1/markets/SOL_USD/orderbook (public)",
		async () => {
			try {
				const res = await fetch(`${API_URL}/v1/markets/SOL_USD/orderbook`);
				return res.ok;
			} catch {
				return false;
			}
		},
		DURATION_SEC * 1000,
	);
}

async function benchCreateOrder() {
	await runLoadTest(
		"POST /v1/orders (LIMIT, no match)",
		async () => {
			try {
				const price = 50 + Math.floor(Math.random() * 10);
				const res = await fetch(`${API_URL}/v1/orders`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Api-Key": SERVICE_TOKEN ?? "",
						"X-Service-Email": SERVICE_EMAIL ?? "",
					},
					body: JSON.stringify({
						type: "LIMIT",
						side: "BUY",
						symbol: "SOL_USD",
						price: String(price),
						qty: "0.1",
					}),
				});
				return res.ok;
			} catch {
				return false;
			}
		},
		DURATION_SEC * 1000,
	);
}

async function benchTrades() {
	await runLoadTest(
		"GET /v1/markets/SOL_USD/trades (public)",
		async () => {
			try {
				const res = await fetch(`${API_URL}/v1/markets/SOL_USD/trades?limit=50`);
				return res.ok;
			} catch {
				return false;
			}
		},
		DURATION_SEC * 1000,
	);
}

// --- Main ---

console.log("=== API Load Tests ===");
console.log(`  URL: ${API_URL}`);
console.log(`  Concurrency: ${CONCURRENCY}`);
console.log(`  Duration: ${DURATION_SEC}s\n`);

// Warm up — make sure backend is alive
try {
	const res = await fetch(`${API_URL}/health`);
	if (!res.ok) {
		console.error(`Backend health check failed (${res.status}). Is it running?`);
		process.exit(1);
	}
	console.log("  Backend is healthy\n");
} catch (err) {
	console.error(`Cannot reach backend at ${API_URL}. Is it running?`);
	process.exit(1);
}

await benchMarkets();
console.log();
await benchOrderbook();
console.log();
if (SERVICE_TOKEN && SERVICE_EMAIL) {
	await benchCreateOrder();
	console.log();
} else {
	console.log("  POST /v1/orders skipped (no service token or email)\n");
}
await benchTrades();
console.log();
