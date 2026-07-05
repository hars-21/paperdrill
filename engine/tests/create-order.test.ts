import { beforeEach, expect, test } from "bun:test";
import { placeOrder } from "../src/order";
import { resetState } from "./utils";
import { getDepth } from "../src/orderbook";

beforeEach(() => {
	resetState();
});

test("limit buy order does not match", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 200n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const depth = getDepth("BTC_USD");

	expect(result).toMatchObject({
		status: "OPEN",
		filledQty: 0n,
		averagePrice: null,
		fills: [],
	});

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "100",
				qty: "5",
			},
		],
		asks: [
			{
				price: "200",
				qty: "5",
			},
		],
	});
});

test("limit buy order matches best ask", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 5n,
		averagePrice: 100n,
	});
});

test("limit buy order has better price than best ask", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 200n,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 5n,
		averagePrice: 100n,
	});
});

test("limit sell order does not match", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 200n,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "OPEN",
		filledQty: 0n,
		averagePrice: null,
		fills: [],
	});
});

test("limit sell order has better price than best bid", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 200n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 5n,
		averagePrice: 200n,
	});
});

test("partial fill for limit order", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 3n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 10n,
	});

	const depth = getDepth("BTC_USD");

	expect(result).toMatchObject({
		status: "PARTIALLY_FILLED",
		filledQty: 3n,
		averagePrice: 100n,
	});

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "100",
				qty: "7",
			},
		],
		asks: [],
	});
});

test("match multiple price levels", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 2n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 110n,
		qty: 3n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 120n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 120n,
		qty: 10n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 10n,
		averagePrice: 113n,
	});
});

test("limit buy orders should not cross above allowed price", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 2n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 110n,
		qty: 3n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 130n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 110n,
		qty: 10n,
	});

	const depth = getDepth("BTC_USD");

	expect(result).toMatchObject({
		status: "PARTIALLY_FILLED",
		filledQty: 5n,
		averagePrice: 106n,
	});

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "110",
				qty: "5",
			},
		],
		asks: [
			{
				price: "130",
				qty: "5",
			},
		],
	});
});

test("market buy order fully filled", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 5n,
		averagePrice: 100n,
	});
});

test("market buy order partially filled", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 2n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "CANCELLED",
		filledQty: 2n,
		averagePrice: 100n,
	});
});

test("market order with empty book", () => {
	expect(() => {
		placeOrder({
			orderId: crypto.randomUUID(),
			userId: "2",
			side: "BUY",
			type: "MARKET",
			symbol: "BTC_USD",
			price: null,
			qty: 5n,
		});
	}).toThrow("No liquidity");
});

test("market buy order consumes first seller at price level", () => {
	const firstOrder = placeOrder({
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
		price: 100n,
		qty: 5n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 5n,
		averagePrice: 100n,
	});

	expect(result.fills[0]?.sellOrderId).toBe(firstOrder.orderId);
});
