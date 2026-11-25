import { expect, test } from "bun:test";
import { getAnchorScaled, type PriceConfig } from "../src/price";

const config: PriceConfig = {
	tickerKeyPrefix: "market:ticker:",
	tickerMaxAgeMs: 15_000,
	oracleCacheMs: 5_000,
	oracleTimeoutMs: 2_000,
	pricePrecision: 2,
};

function client(raw: string | null) {
	return { get: async () => raw };
}

function oracle(bid: string, ask: string) {
	let calls = 0;
	const impl = (async () => {
		calls++;
		return new Response(JSON.stringify({ bid, ask }), { status: 200 });
	}) as unknown as typeof fetch;
	return { impl, calls: () => calls };
}

test("a fresh internal ticker is used as the anchor", async () => {
	const raw = JSON.stringify({ lastPrice: "6750025", timestamp: Date.now() });
	const external = oracle("1", "1");

	expect(await getAnchorScaled("BTC_USD", client(raw), config, external.impl)).toBe(6_750_025n);
	expect(external.calls()).toBe(0);
});

test("a stale ticker falls back to the oracle midpoint", async () => {
	const raw = JSON.stringify({ lastPrice: "6750025", timestamp: Date.now() - 60_000 });
	const external = oracle("100.00", "101.00");

	expect(await getAnchorScaled("BTC_USD", client(raw), config, external.impl)).toBe(10_050n);
	expect(external.calls()).toBe(1);
});

test("oracle results are cached for the configured window", async () => {
	const external = oracle("200.00", "202.00");

	await getAnchorScaled("SOL_USD", client(null), config, external.impl);
	await getAnchorScaled("SOL_USD", client(null), config, external.impl);

	expect(external.calls()).toBe(1);
});

test("invalid ticker values and oracle failures return no anchor", async () => {
	const badTicker = JSON.stringify({ lastPrice: "0", timestamp: Date.now() });
	const failing = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;

	expect(await getAnchorScaled("ETH_USD", client(badTicker), config, failing)).toBeNull();
});
