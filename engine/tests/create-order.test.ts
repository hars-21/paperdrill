import { beforeEach, expect, test } from "bun:test";
import { placeOrder } from "../src/order";
import { resetState } from "./utils";
import { getDepth } from "../src/orderbook";

beforeEach(() => {
	resetState();
});

test("limit buy order does not match", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 50000n,
	});

	const result = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const depth = await getDepth("BTC_USD");

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

test("limit buy order matches best ask", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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

test("limit buy order has better price than best ask", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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

test("limit sell order does not match", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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

test("limit sell order has better price than best bid", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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

test("partial fill for limit order", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 30000n,
	});

	const result = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100000n,
	});

	const depth = await getDepth("BTC_USD");

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

test("match multiple price levels", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 11000n,
		qty: 30000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 12000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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

test("limit buy orders should not cross above allowed price", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 11000n,
		qty: 30000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 13000n,
		qty: 50000n,
	});

	const result = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 11000n,
		qty: 100000n,
	});

	const depth = await getDepth("BTC_USD");

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

test("market buy order fully filled", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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

test("market buy order partially filled", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});

	const result = await placeOrder({
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

test("market order with empty book", async () => {
	await expect(
		placeOrder({
			orderId: crypto.randomUUID(),
			userId: "2",
			side: "BUY",
			type: "MARKET",
			symbol: "BTC_USD",
			price: null,
			qty: 50000n,
		}),
	).rejects.toThrow("No liquidity");
});

test("market buy order consumes first seller at price level", async () => {
	const firstOrder = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const result = await placeOrder({
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
