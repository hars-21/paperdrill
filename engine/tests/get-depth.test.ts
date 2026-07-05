import { beforeEach, expect, test } from "bun:test";
import { getDepth } from "../src/orderbook";
import { cancelOrder, placeOrder } from "../src/order";
import { resetState } from "./utils";

beforeEach(() => {
	resetState();
});

test("empty orderbook", () => {
	const depth = getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("bids sorted highest first", () => {
	placeOrder({
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
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 120n,
		qty: 3n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 90n,
		qty: 2n,
	});

	const depth = getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "120",
				qty: "3",
			},
			{
				price: "100",
				qty: "5",
			},
			{
				price: "90",
				qty: "2",
			},
		],
		asks: [],
	});
});

test("asks sorted lowest first", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 120n,
		qty: 3n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 90n,
		qty: 2n,
	});

	const depth = getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [
			{
				price: "90",
				qty: "2",
			},
			{
				price: "100",
				qty: "5",
			},
			{
				price: "120",
				qty: "3",
			},
		],
	});
});

test("same price orders should be grouped", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 3n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const depth = getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "100",
				qty: "8",
			},
		],
		asks: [],
	});
});

test("filled orders should not appear", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const depth = getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("cancelled orders should not appear", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});
	cancelOrder("1", order.orderId);

	const depth = getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});
