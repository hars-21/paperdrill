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
		price: 20000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
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
				price: "10000",
				qty: "50000",
			},
		],
		asks: [
			{
				price: "20000",
				qty: "50000",
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
		price: 10000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 50000n,
		averagePrice: 10000n,
	});
});

test("limit buy order has better price than best ask", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 50000n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 50000n,
		averagePrice: 10000n,
	});
});

test("limit sell order does not match", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 50000n,
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
		price: 20000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 50000n,
		averagePrice: 20000n,
	});
});

test("partial fill for limit order", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 30000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100000n,
	});

	const depth = getDepth("BTC_USD");

	expect(result).toMatchObject({
		status: "PARTIALLY_FILLED",
		filledQty: 30000n,
		averagePrice: 10000n,
	});

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "10000",
				qty: "70000",
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
		price: 10000n,
		qty: 20000n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 11000n,
		qty: 30000n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 12000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 12000n,
		qty: 100000n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 100000n,
		averagePrice: 11300n,
	});
});

test("limit buy orders should not cross above allowed price", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 11000n,
		qty: 30000n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 13000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 11000n,
		qty: 100000n,
	});

	const depth = getDepth("BTC_USD");

	expect(result).toMatchObject({
		status: "PARTIALLY_FILLED",
		filledQty: 50000n,
		averagePrice: 10600n,
	});

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "11000",
				qty: "50000",
			},
		],
		asks: [
			{
				price: "13000",
				qty: "50000",
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
		price: 10000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 50000n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 50000n,
		averagePrice: 10000n,
	});
});

test("market buy order partially filled", () => {
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 50000n,
	});

	expect(result).toMatchObject({
		status: "CANCELLED",
		filledQty: 20000n,
		averagePrice: 10000n,
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
			qty: 50000n,
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
		price: 10000n,
		qty: 50000n,
	});
	placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(result).toMatchObject({
		status: "FILLED",
		filledQty: 50000n,
		averagePrice: 10000n,
	});

	expect(result.fills[0]?.sellOrderId).toBe(firstOrder.orderId);
});
