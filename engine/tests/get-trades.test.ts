import { beforeEach, expect, test } from "bun:test";
import { getTradesHandler } from "../src/handlers/getTrades";
import { config } from "../src/config";
import { RECENT_TRADES, recordFill } from "../src/store";
import { placeOrder, resetState } from "./utils";

beforeEach(() => {
	resetState();
});

test("no trades initially", async () => {
	const result = await getTradesHandler({ symbol: "BTC_USD" });

	expect(result).toHaveLength(0);
});

test("trades returned newest first", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 20000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 30000n,
	});

	const result = await getTradesHandler({ symbol: "BTC_USD" });

	expect(result).toHaveLength(2);
	expect(result[0]).toMatchObject({ price: 10000n, qty: 30000n });
	expect(result[1]).toMatchObject({ price: 10000n, qty: 20000n });
});

test("limit returns most recent trades", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 10000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 20000n,
	});

	const result = await getTradesHandler({ symbol: "BTC_USD", limit: "1" });

	expect(result).toHaveLength(1);
	expect(result[0]).toMatchObject({ qty: 20000n });
});

test("limit above buffer cap rejected", () => {
	expect(
		getTradesHandler({ symbol: "BTC_USD", limit: config.recentTradesLimit + 1 }),
	).rejects.toThrow();
});

test("buffer evicts oldest beyond cap", () => {
	const original = config.recentTradesLimit;
	config.recentTradesLimit = 3;

	try {
		for (let i = 0; i < 5; i++) {
			recordFill({
				id: String(i),
				symbol: "BTC_USD",
				price: 10000n,
				qty: 1000n,
				buyOrderId: `b${i}`,
				sellOrderId: `s${i}`,
				buyerId: "1",
				sellerId: "2",
				isBuyerMaker: false,
				createdAt: i,
			});
		}

		expect(RECENT_TRADES.BTC_USD?.map((f) => f.id)).toEqual(["2", "3", "4"]);
	} finally {
		config.recentTradesLimit = original;
	}
});
