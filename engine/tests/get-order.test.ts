import { beforeEach, expect, test } from "bun:test";
import { resetState } from "./utils";
import { getOrder, placeOrder } from "../src/order";

beforeEach(() => {
	resetState();
});

test("open order", async () => {
	const order = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(getOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
		filledQty: 0n,
		status: "OPEN",
		fills: [],
	});
});

test("partially filled order", async () => {
	const order = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});

	expect(getOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
		filledQty: 20000n,
		status: "PARTIALLY_FILLED",
	});
});

test("filled order", async () => {
	const order = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(getOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
		filledQty: 50000n,
		status: "FILLED",
	});
});

test("unknown order", () => {
	expect(() => {
		getOrder("1", "invalid-order-id");
	}).toThrow("Order not Found");
});

test("user tries to read another user's order", async () => {
	const order = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(() => {
		getOrder("2", order.orderId);
	}).toThrow("Order not Found");
});
