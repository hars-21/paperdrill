import { beforeEach, expect, test } from "bun:test";
import { getUserBalance, initializeUserBalance } from "../src/modules/balance";
import { BALANCES } from "../src/store";
import { resetState, cancelOrder, placeOrder } from "./utils";

beforeEach(() => {
	resetState();
});

test("reading a new user balance does not initialize funds", () => {
	const balance = getUserBalance("3");

	expect(balance).toEqual({});
	expect(BALANCES["3"]).toBeUndefined();
});

test("initializes a new user with only the starting asset", () => {
	const balance = initializeUserBalance("3", "USD", 100000n);

	expect(balance).toEqual({
		USD: {
			available: 100000n,
			locked: 0n,
		},
	});
});

test("does not grant the starting balance twice", () => {
	initializeUserBalance("3", "USD", 100000n);
	initializeUserBalance("3", "USD", 100000n);

	expect(getUserBalance("3").USD?.available).toBe(100000n);
});

test("a fill adds acquired assets to sparse balances", async () => {
	delete BALANCES["1"]?.USD;
	delete BALANCES["2"]?.BTC;

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(getUserBalance("1").USD).toEqual({ available: 50000n, locked: 0n });
	expect(getUserBalance("2").BTC).toEqual({ available: 50000n, locked: 0n });
});

test("buyer balance after fill", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const balance = getUserBalance("2");

	expect(balance).toMatchObject({
		USD: {
			available: 950000n,
			locked: 0n,
		},
		BTC: {
			available: 1050000n,
			locked: 0n,
		},
	});
});

test("seller balance after fill", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	const balance = getUserBalance("1");

	expect(balance).toMatchObject({
		USD: {
			available: 1050000n,
			locked: 0n,
		},
		BTC: {
			available: 950000n,
			locked: 0n,
		},
	});
});

test("open order should lock balance", async () => {
	await placeOrder({
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
		price: 20000n,
		qty: 50000n,
	});

	const buyerBalance = getUserBalance("1");
	const sellerBalance = getUserBalance("2");

	expect(buyerBalance).toMatchObject({
		USD: {
			available: 950000n,
			locked: 50000n,
		},
	});

	expect(sellerBalance).toMatchObject({
		BTC: {
			available: 950000n,
			locked: 50000n,
		},
	});
});

test("cancelled order should unlock balance", async () => {
	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	expect(getUserBalance("1")).toMatchObject({
		USD: {
			available: 950000n,
			locked: 50000n,
		},
	});

	await cancelOrder("1", order.id);

	expect(getUserBalance("1")).toMatchObject({
		USD: {
			available: 1000000n,
			locked: 0n,
		},
	});
});

test("cancel after a partial fill keeps the purchase and refunds only the remainder", async () => {
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

	await cancelOrder("1", order.id);

	expect(getUserBalance("1")).toMatchObject({
		USD: { available: 960000n, locked: 0n },
		BTC: { available: 1040000n, locked: 0n },
	});
});

test("a filled limit buy refunds price improvement", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 50000n,
	});

	expect(getUserBalance("2")).toMatchObject({
		USD: { available: 950000n, locked: 0n },
		BTC: { available: 1050000n, locked: 0n },
	});
});

test("a partially filled market sell unlocks the unfilled quantity", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 20000n,
	});

	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "SELL",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 50000n,
	});

	expect(order).toMatchObject({ status: "CANCELLED", filledQty: 20000n });
	expect(getUserBalance("2")).toMatchObject({
		USD: { available: 1020000n, locked: 0n },
		BTC: { available: 980000n, locked: 0n },
	});
});

test("an affordable market buy can fill across multiple price levels", async () => {
	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 10000n,
	});

	await placeOrder({
		id: crypto.randomUUID(),
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 20000n,
		qty: 40000n,
	});

	const order = await placeOrder({
		id: crypto.randomUUID(),
		userId: "2",
		side: "BUY",
		type: "MARKET",
		symbol: "BTC_USD",
		price: null,
		qty: 50000n,
	});

	expect(order).toMatchObject({
		status: "FILLED",
		filledQty: 50000n,
		averagePrice: 18000n,
	});
	expect(getUserBalance("2")).toMatchObject({
		USD: { available: 910000n, locked: 0n },
		BTC: { available: 1050000n, locked: 0n },
	});
});
