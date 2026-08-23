import { beforeEach, expect, test } from "bun:test";
import { cancelOrder, placeOrder, resetState } from "./utils";
import { getDepth } from "../src/modules/orderbook";

beforeEach(() => {
	resetState();
});

test("cancel open limit order", async () => {
	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100000n,
	});

	expect(await cancelOrder("1", order.id)).toMatchObject({
		id: order.id,
		qty: 100000n,
		filledQty: 0n,
		status: "CANCELLED",
	});

	expect(await getDepth("BTC_USD")).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("cancel partially filled order", async () => {
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

	expect(await cancelOrder("1", order.id)).toMatchObject({
		id: order.id,
		qty: 100000n,
		filledQty: 40000n,
		status: "CANCELLED",
	});

	expect(await getDepth("BTC_USD")).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("cancel filled order", async () => {
	const order = await placeOrder({
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

	await expect(cancelOrder("1", order.id)).rejects.toThrow(
		"Filled orders cannot be cancelled",
	);
});

test("cancel already cancelled order", async () => {
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

	const result = await cancelOrder("1", order.id);
	expect(result).toMatchObject({ message: "Order already cancelled" });
});

test("cancel unknown order", async () => {
	await expect(cancelOrder("1", "invalid-order-id")).rejects.toThrow("Order not found");
});

test("user tries to cancel another user's order", async () => {
	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await expect(cancelOrder("2", order.id)).rejects.toThrow("Order not found");
});
