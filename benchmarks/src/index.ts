import { arch, cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";
import { ServiceClient, assertHealthy } from "./client";
import { config } from "./config";
import { percentile, printLoad, requireSuccessful, runLoad } from "./metrics";

const FUNDING_AMOUNT = "1000000000000000";
const btcService = new ServiceClient("btc.service@paperdrill.dev");
const solService = new ServiceClient("sol.service@paperdrill.dev");
const ethService = new ServiceClient("eth.service@paperdrill.dev");

async function seedOrders(options: {
	client: ServiceClient;
	total: number;
	input: (index: number) => Parameters<ServiceClient["createOrder"]>[0];
}) {
	const result = await runLoad({
		total: options.total,
		concurrency: config.httpConcurrency,
		operation: async (index) => (await options.client.createOrder(options.input(index))).ok,
	});
	requireSuccessful("Liquidity setup", result);
}

async function benchmarkUnmatchedOrders() {
	await btcService.deposit("USD", FUNDING_AMOUNT);

	const result = await runLoad({
		total: config.unmatchedOrders,
		concurrency: config.httpConcurrency,
		operation: async (index) => {
			const cents = 100 + (index % 100);
			const response = await btcService.createOrder({
				type: "LIMIT",
				side: "BUY",
				symbol: "BTC_USD",
				price: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`,
				qty: "0.0100",
			});
			return response.ok && response.data.status === "OPEN";
		},
	});

	printLoad("Unmatched limit-order load", result);
	requireSuccessful("Unmatched order benchmark", result);
}

async function benchmarkMatchedOrders() {
	await Promise.all([
		solService.deposit("SOL", FUNDING_AMOUNT),
		btcService.deposit("USD", FUNDING_AMOUNT),
	]);

	await seedOrders({
		client: solService,
		total: config.matchedOrders,
		input: () => ({
			type: "LIMIT",
			side: "SELL",
			symbol: "SOL_USD",
			price: "100.00",
			qty: "0.01",
		}),
	});

	const result = await runLoad({
		total: config.matchedOrders,
		concurrency: config.httpConcurrency,
		operation: async () => {
			const response = await btcService.createOrder({
				type: "LIMIT",
				side: "BUY",
				symbol: "SOL_USD",
				price: "100.00",
				qty: "0.01",
			});
			return response.ok && response.data.status === "FILLED" && response.data.filledQty === "0.01";
		},
	});

	printLoad("Matched limit-order load (one fill per taker)", result, "matched orders");
	requireSuccessful("Matched order benchmark", result);
}

async function benchmarkSweep() {
	await Promise.all([
		ethService.deposit("ETH", FUNDING_AMOUNT),
		btcService.deposit("USD", FUNDING_AMOUNT),
	]);

	await seedOrders({
		client: ethService,
		total: config.sweepOrders,
		input: () => ({
			type: "LIMIT",
			side: "SELL",
			symbol: "ETH_USD",
			price: "200.00",
			qty: "0.001",
		}),
	});

	const quantity = (config.sweepOrders / 1000).toFixed(3);
	const startedAt = performance.now();
	const response = await btcService.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "ETH_USD",
		price: "200.00",
		qty: quantity,
	});
	const elapsedMs = performance.now() - startedAt;

	if (!response.ok || response.data.status !== "FILLED" || response.data.filledQty !== quantity) {
		throw new Error(`Sweep failed: ${JSON.stringify(response.data)}`);
	}

	console.log(`\nSingle-order sweep`);
	console.log(`  ${config.sweepOrders} maker orders matched in ${elapsedMs.toFixed(1)} ms`);
}

async function waitFor(
	condition: () => boolean,
	timeoutMs: number,
	description: string,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (condition()) return;
		await Bun.sleep(10);
	}
	throw new Error(`Timed out waiting for ${description}`);
}

async function benchmarkWebSockets() {
	const sockets: WebSocket[] = [];
	const probeRecipients = new Set<number>();
	const deliveryLatencies = new Map<number, number>();
	let targetPrice = "";
	let measuring = false;
	let deliveryStartedAt = 0;

	const connectStartedAt = performance.now();
	await Promise.all(
		Array.from(
			{ length: config.websocketConnections },
			(_, index) =>
				new Promise<void>((resolve, reject) => {
					const socket = new WebSocket(config.wsUrl);
					sockets.push(socket);

					const timeout = setTimeout(
						() => reject(new Error(`WebSocket ${index} connection timed out`)),
						config.websocketTimeoutMs,
					);

					socket.addEventListener("open", () => {
						clearTimeout(timeout);
						socket.send(JSON.stringify({ method: "SUBSCRIBE", params: ["depth:BTC_USD"] }));
						resolve();
					});
					socket.addEventListener("error", () => {
						clearTimeout(timeout);
						reject(new Error(`WebSocket ${index} failed to connect`));
					});
					socket.addEventListener("message", (event) => {
						try {
							const message = JSON.parse(String(event.data)) as {
								bids?: Array<{ price: string }>;
							};
							if (!message.bids?.some((level) => level.price === targetPrice)) return;

							if (measuring) {
								if (!deliveryLatencies.has(index)) {
									deliveryLatencies.set(index, performance.now() - deliveryStartedAt);
								}
							} else {
								probeRecipients.add(index);
							}
						} catch {
							// Ignore unrelated or malformed messages during the benchmark.
						}
					});
				}),
		),
	);
	const connectMs = performance.now() - connectStartedAt;

	for (let attempt = 0; attempt < 10 && probeRecipients.size < sockets.length; attempt++) {
		targetPrice = `${10 + attempt}.00`;
		await btcService.createOrder({
			type: "LIMIT",
			side: "BUY",
			symbol: "BTC_USD",
			price: targetPrice,
			qty: "1.0000",
		});
		try {
			await waitFor(() => probeRecipients.size === sockets.length, 500, "WebSocket subscriptions");
		} catch {
			// A later probe gives subscriptions that were still being registered another chance.
		}
	}

	if (probeRecipients.size !== sockets.length) {
		for (const socket of sockets) socket.close();
		throw new Error(`Only ${probeRecipients.size}/${sockets.length} WebSockets subscribed`);
	}

	targetPrice = "25.00";
	measuring = true;
	deliveryStartedAt = performance.now();
	const trigger = await btcService.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "BTC_USD",
		price: targetPrice,
		qty: "1.0000",
	});
	if (!trigger.ok)
		throw new Error(`WebSocket trigger order failed: ${JSON.stringify(trigger.data)}`);

	await waitFor(
		() => deliveryLatencies.size === sockets.length,
		config.websocketTimeoutMs,
		"WebSocket depth delivery",
	);

	console.log(`\nWebSocket fan-out`);
	console.log(
		`  ${sockets.length} connections opened in ${connectMs.toFixed(1)} ms | ${deliveryLatencies.size}/${sockets.length} received update | p95 ${percentile([...deliveryLatencies.values()], 0.95).toFixed(1)} ms`,
	);

	for (const socket of sockets) socket.close();
}

async function main() {
	await assertHealthy();

	const cpu = cpus()[0]?.model ?? "unknown CPU";
	console.log("PaperDrill v1 benchmark");
	console.log(`  Bun ${Bun.version} | ${platform()} ${arch()} | ${cpus().length} cores | ${cpu}`);
	console.log(
		`  HTTP concurrency ${config.httpConcurrency} | ${config.unmatchedOrders} unmatched | ${config.matchedOrders} matched | ${config.websocketConnections} WebSockets`,
	);

	await benchmarkUnmatchedOrders();
	await benchmarkMatchedOrders();
	await benchmarkSweep();
	await benchmarkWebSockets();

	console.log("\nAll benchmark correctness checks passed.");
}

await main();
