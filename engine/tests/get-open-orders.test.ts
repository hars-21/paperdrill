import { beforeEach, expect, test } from "bun:test";
import { getOpenOrdersHandler } from "../src/handlers/getOpenOrders";
import { cancelOrder, placeOrder, resetState } from "./utils";

beforeEach(() => {
	resetState();
});

test("a user sees only their own active orders", async () => {
	const ownOrder = await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 50000n,
	});

	const result = await getOpenOrdersHandler({ userId: "1" });

	expect(result).toHaveLength(1);
	expect(result[0]).toMatchObject({ id: ownOrder.id, userId: "1", status: "OPEN" });
});

test("a partially filled limit order remains open with its filled quantity", async () => {
	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 40000n,
	});

	const result = await getOpenOrdersHandler({ userId: "1" });

	expect(result).toHaveLength(1);
	expect(result[0]).toMatchObject({
		id: order.id,
		status: "PARTIALLY_FILLED",
		qty: 100000n,
		filledQty: 40000n,
	});
});

test("cancelled orders are removed from the active order list", async () => {
	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await cancelOrder("1", order.id);

	expect(await getOpenOrdersHandler({ userId: "1" })).toEqual([]);
});

test("filled orders are removed from the active order list", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(await getOpenOrdersHandler({ userId: "1" })).toEqual([]);
});
