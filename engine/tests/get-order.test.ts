import { beforeEach, expect, test } from "bun:test";
import { resetState } from "./utils";
import { getOrder, placeOrder } from "../src/order";

beforeEach(() => {
	resetState();
});

test("open order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(getOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
		filledQty: 0n,
		status: "OPEN",
		fills: [],
	});
});

test("partially filled order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 2n,
	});

	expect(getOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
		filledQty: 2n,
		status: "PARTIALLY_FILLED",
	});
});

test("filled order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(getOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
		filledQty: 5n,
		status: "FILLED",
	});
});

test("unknown order", () => {
	expect(() => {
		getOrder("1", "invalid-order-id");
	}).toThrow("Order not Found");
});

test("user tries to read another user's order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(() => {
		getOrder("2", order.orderId);
	}).toThrow("Order not Found");
});
