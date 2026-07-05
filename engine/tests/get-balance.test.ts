import { beforeEach, expect, test } from "bun:test";
import { getUserBalance } from "../src/balance";
import { resetState } from "./utils";
import { cancelOrder, placeOrder } from "../src/order";

beforeEach(() => {
	resetState();
});

test("new user balance", () => {
	const balance = getUserBalance("1");

	expect(balance).toMatchObject({
		USD: {
			available: 10000n,
			locked: 0n,
		},
		BTC: {
			available: 100n,
			locked: 0n,
		},
	});
});

test("buyer balance after fill", () => {
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

	const balance = getUserBalance("2");

	expect(balance).toMatchObject({
		USD: {
			available: 9500n,
			locked: 0n,
		},
		BTC: {
			available: 105n,
			locked: 0n,
		},
	});
});

test("seller balance after fill", () => {
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

	const balance = getUserBalance("1");

	expect(balance).toMatchObject({
		USD: {
			available: 10500n,
			locked: 0n,
		},
		BTC: {
			available: 95n,
			locked: 0n,
		},
	});
});

test("open order should lock balance", () => {
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
		userId: "2",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 200n,
		qty: 5n,
	});

	const buyerBalance = getUserBalance("1");
	const sellerBalance = getUserBalance("2");

	expect(buyerBalance).toMatchObject({
		USD: {
			available: 9500n,
			locked: 500n,
		},
	});

	expect(sellerBalance).toMatchObject({
		BTC: {
			available: 95n,
			locked: 5n,
		},
	});
});

test("cancelled order should unlock balance", () => {
	const order = placeOrder({
		orderId: crypto.randomUUID(),
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 100n,
		qty: 5n,
	});

	expect(getUserBalance("1")).toMatchObject({
		USD: {
			available: 9500n,
			locked: 500n,
		},
	});

	cancelOrder("1", order.orderId);

	expect(getUserBalance("1")).toMatchObject({
		USD: {
			available: 10000n,
			locked: 0n,
		},
	});
});
