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
			available: 1000000n,
			locked: 0n,
		},
		BTC: {
			available: 1000000n,
			locked: 0n,
		},
	});
});

test("buyer balance after fill", async () => {
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
		orderId: crypto.randomUUID(),
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

	await cancelOrder("1", order.orderId);

	expect(getUserBalance("1")).toMatchObject({
		USD: {
			available: 1000000n,
			locked: 0n,
		},
	});
});
