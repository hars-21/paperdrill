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
		price: 100n,
		qty: 10n,
	});

	expect(cancelOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		qty: 10n,
		filledQty: 0n,
		status: "CANCELLED",
		releasedFunds: 1000n,
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
		price: 100n,
		qty: 10n,
	});

	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 4n,
	});

	expect(cancelOrder("1", order.orderId)).toMatchObject({
		orderId: order.orderId,
		qty: 10n,
		filledQty: 4n,
		status: "CANCELLED",
		releasedFunds: 600n,
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
		price: 100n,
		qty: 5n,
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
		price: 100n,
		qty: 5n,
	});

	expect(() => {
		cancelOrder("2", order.orderId);
	}).toThrow("Order not Found");
});
