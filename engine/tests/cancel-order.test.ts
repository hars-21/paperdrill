import { beforeEach, expect, test } from "bun:test";
import { cancelOrder, placeOrder } from "../src/order";
import { getDepth } from "../src/orderbook";
import { resetState } from "./utils";

beforeEach(() => {
	resetState();
});

test("cancel open limit order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100000n,
	});

	expect(cancelOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		qty: 100000n,
		filledQty: 0n,
		status: "CANCELLED",
		releasedFunds: 100000n,
	});

	expect(getDepth("BTC_USD")).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("cancel partially filled order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100000n,
	});

	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 40000n,
	});

	expect(cancelOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		qty: 100000n,
		filledQty: 40000n,
		status: "CANCELLED",
		releasedFunds: 60000n,
	});

	expect(getDepth("BTC_USD")).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("cancel filled order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(() => {
		cancelOrder("1", order.orderId);
	}).toThrow("Filled orders cannot be cancelled");
});

test("cancel already cancelled order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	cancelOrder("1", order.orderId);

	const result = cancelOrder("1", order.orderId);
	expect(result).toMatchObject({ message: "Order already cancelled" });
});

test("cancel unknown order", () => {
	expect(() => {
		cancelOrder("1", "invalid-order-id");
	}).toThrow("Order not Found");
});

test("user tries to cancel another user's order", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(() => {
		cancelOrder("2", order.orderId);
	}).toThrow("Order not Found");
});
