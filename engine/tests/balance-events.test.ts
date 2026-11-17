import { afterAll, beforeEach, expect, test } from "bun:test";
import { onEvent } from "../src/core/eventBus";
import { addBalance, applyCredit } from "../src/modules/balance";
import type { BalanceChangedEvent } from "../src/types/event";
import { cancelOrder, placeOrder, resetState } from "./utils";

const events: BalanceChangedEvent[] = [];

const unsubscribe = onEvent("balance.changed", (event) => {
	if (event.type === "balance.changed") events.push(event);
});

afterAll(unsubscribe);

beforeEach(() => {
	resetState();
	events.length = 0;
});

function balanceEvents(reason: BalanceChangedEvent["reason"]) {
	return events.filter((event) => event.reason === reason);
}

test("a deposit emits a balance.changed event", () => {
	addBalance("1", "USD", 500n);

	expect(balanceEvents("deposited")).toEqual([
		expect.objectContaining({
			userId: "1",
			asset: "USD",
			available: 1000500n,
			locked: 0n,
			deltaAvailable: 500n,
			deltaLocked: 0n,
			referenceId: null,
		}),
	]);
});

test("a daily credit references the credit id", async () => {
	applyCredit("credit-1", "1", "USD", 250n);

	expect(balanceEvents("credited")).toEqual([
		expect.objectContaining({
			userId: "1",
			asset: "USD",
			deltaAvailable: 250n,
			referenceId: "credit-1",
		}),
	]);
});

test("locking an order references the order", async () => {
	await placeOrder({
		id: "order-1",
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100n,
	});

	expect(balanceEvents("order.locked")).toEqual([
		expect.objectContaining({
			userId: "1",
			asset: "USD",
			deltaAvailable: -100n,
			deltaLocked: 100n,
			referenceId: "order-1",
			symbol: "BTC_USD",
		}),
	]);
});

test("cancelling an order emits the release event", async () => {
	const order = await placeOrder({
		id: "order-2",
		userId: "1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 100n,
	});

	events.length = 0;
	await cancelOrder("1", order.id);

	expect(balanceEvents("order.released")).toEqual([
		expect.objectContaining({
			userId: "1",
			asset: "USD",
			deltaAvailable: 100n,
			deltaLocked: -100n,
			referenceId: "order-2",
		}),
	]);
});

test("a fill emits one balance event per side and asset", async () => {
	await placeOrder({
		id: "sell-order",
		userId: "1",
		side: "SELL",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50n,
	});

	events.length = 0;

	const result = await placeOrder({
		id: "buy-order",
		userId: "2",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: 10000n,
		qty: 50n,
	});

	const fill = result.fills[0]!;
	const settled = balanceEvents("fill.settled");

	expect(settled).toHaveLength(4);
	expect(settled).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				userId: "2",
				asset: "USD",
				deltaAvailable: 0n,
				deltaLocked: -50n,
				referenceId: fill.id,
				symbol: "BTC_USD",
			}),
			expect.objectContaining({
				userId: "2",
				asset: "BTC",
				deltaAvailable: 50n,
				deltaLocked: 0n,
				referenceId: fill.id,
				symbol: "BTC_USD",
			}),
			expect.objectContaining({
				userId: "1",
				asset: "USD",
				deltaAvailable: 50n,
				deltaLocked: 0n,
				referenceId: fill.id,
				symbol: "BTC_USD",
			}),
			expect.objectContaining({
				userId: "1",
				asset: "BTC",
				deltaAvailable: 0n,
				deltaLocked: -50n,
				referenceId: fill.id,
				symbol: "BTC_USD",
			}),
		]),
	);
});
