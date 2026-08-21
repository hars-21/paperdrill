import { beforeEach, expect, test } from "bun:test";
import { getDepth } from "../src/modules/orderbook";
import { cancelOrder, placeOrder, resetState } from "./utils";

beforeEach(() => {
	resetState();
});

test("empty orderbook", async () => {
	const depth = await getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("bids sorted highest first", async () => {
	await placeOrder({
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
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 12000n,
		qty: 30000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 9000n,
		qty: 20000n,
	});

	const depth = await getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "12000",
				qty: "30000",
			},
			{
				price: "10000",
				qty: "50000",
			},
			{
				price: "9000",
				qty: "20000",
			},
		],
		asks: [],
	});
});

test("asks sorted lowest first", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 12000n,
		qty: 30000n,
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
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 9000n,
		qty: 20000n,
	});

	const depth = await getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [
			{
				price: "9000",
				qty: "20000",
			},
			{
				price: "10000",
				qty: "50000",
			},
			{
				price: "12000",
				qty: "30000",
			},
		],
	});
});

test("same price orders should be grouped", async () => {
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 30000n,
	});
	await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const depth = await getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [
			{
				price: "10000",
				qty: "80000",
			},
		],
		asks: [],
	});
});

test("filled orders should not appear", async () => {
	await placeOrder({
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
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const depth = await getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});

test("cancelled orders should not appear", async () => {
	const order = await placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});
	await cancelOrder("1", order.orderId);

	const depth = await getDepth("BTC_USD");

	expect(depth).toMatchObject({
		symbol: "BTC_USD",
		bids: [],
		asks: [],
	});
});
