import { beforeEach, expect, test } from "bun:test";
import { getTradesHandler } from "../src/handlers/getTrades";
import { config } from "../src/config";
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

test("repeated reads return trades in the same order", async () => {
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

	const firstRead = await getTradesHandler({ symbol: "BTC_USD" });
	const secondRead = await getTradesHandler({ symbol: "BTC_USD" });

	expect(firstRead.map((trade) => trade.id)).toEqual(secondRead.map((trade) => trade.id));
	expect(secondRead.map((trade) => trade.qty)).toEqual([30000n, 20000n]);
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

test("trade history keeps only the newest trades within its limit", async () => {
	const original = config.recentTradesLimit;
	config.recentTradesLimit = 3;

	try {
		await placeOrder({
			id: crypto.randomUUID(),
			userId: "1",
			side: "SELL",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: 10000n,
			qty: 5000n,
		});

		const tradeIds: string[] = [];
		for (let i = 0; i < 5; i++) {
			const order = await placeOrder({
				id: crypto.randomUUID(),
				userId: "2",
				side: "BUY",
				type: "MARKET",
				symbol: "BTC_USD",
				qty: 1000n,
				price: null,
			});
			tradeIds.push(order.fills[0]!.id);
		}

		const result = await getTradesHandler({ symbol: "BTC_USD" });
		expect(result.map((trade) => trade.id)).toEqual(tradeIds.slice(2).reverse());
	} finally {
		config.recentTradesLimit = original;
	}
});
