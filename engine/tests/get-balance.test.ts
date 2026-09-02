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
