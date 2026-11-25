import { expect, test } from "bun:test";
import { reviveEventRecord } from "../src/events";
import { MakerState } from "../src/state";
import type { EngineEventRecord } from "../src/types";

const owner = "service-1";

function record(type: string, event: Record<string, unknown>): EngineEventRecord {
	return reviveEventRecord(
		JSON.stringify({
			id: crypto.randomUUID(),
			type,
			version: 1,
			occurredAt: 1,
			event,
		}),
	);
}

function orderEvent(type: string, overrides: Record<string, unknown> = {}) {
	return record(type, {
		order: {
			id: "order-1",
			userId: owner,
			side: "BUY",
			type: "LIMIT",
			symbol: "BTC_USD",
			price: "6750025",
			qty: "2500",
			filledQty: "0",
			status: "OPEN",
			createdAt: 100,
			...overrides,
		},
	});
}

test("engine records revive bigint fields from their wire strings", () => {
	const revived = orderEvent("order.created");
	if (revived.event.type !== "order.created") throw new Error("unexpected event");

	expect(revived.event.order.price).toBe(6_750_025n);
	expect(revived.event.order.qty).toBe(2_500n);
});

test("created and partially filled orders become open state", () => {
	const state = new MakerState(new Set([owner]));

	state.apply(orderEvent("order.created"));
	expect(state.orderCount).toBe(1);

	state.apply(
		orderEvent("order.partially_filled", {
			filledQty: "500",
			status: "PARTIALLY_FILLED",
		}),
	);
	expect(state.ordersFor(owner, "BTC_USD")[0]?.filledQty).toBe(500n);
});

test("filled and cancelled orders are removed from open state", () => {
	const state = new MakerState(new Set([owner]));

	state.apply(orderEvent("order.created"));
	state.apply(orderEvent("order.filled", { status: "FILLED" }));
	expect(state.orderCount).toBe(0);

	state.apply(orderEvent("order.created"));
	state.apply(orderEvent("order.cancelled", { status: "CANCELLED" }));
	expect(state.orderCount).toBe(0);
});

test("orders and balances for other users are ignored", () => {
	const state = new MakerState(new Set([owner]));

	state.apply(orderEvent("order.created", { userId: "someone-else" }));
	state.apply(
		record("balance.changed", {
			userId: "someone-else",
			asset: "USD",
			available: "999",
			locked: "0",
			deltaAvailable: "999",
			deltaLocked: "0",
			reason: "deposited",
			referenceId: null,
			symbol: null,
			occurredAt: 1,
		}),
	);

	expect(state.orderCount).toBe(0);
	expect(state.balance(owner, "USD")).toEqual({ available: 0n, locked: 0n });
});

test("balance events replace the local snapshot with absolute values", () => {
	const state = new MakerState(new Set([owner]));
	const base = {
		userId: owner,
		asset: "USD",
		deltaAvailable: "10000",
		deltaLocked: "0",
		reason: "deposited",
		referenceId: null,
		symbol: null,
		occurredAt: 1,
	};

	state.apply(record("balance.changed", { ...base, available: "10000", locked: "0" }));
	state.apply(
		record("balance.changed", {
			...base,
			available: "8000",
			locked: "2000",
			deltaAvailable: "-2000",
			reason: "order.locked",
		}),
	);

	expect(state.balance(owner, "USD")).toEqual({ available: 8_000n, locked: 2_000n });
});

test("unsupported event versions are ignored", () => {
	const state = new MakerState(new Set([owner]));
	const raw = orderEvent("order.created");
	state.apply({ ...raw, version: 2 });
	expect(state.orderCount).toBe(0);
});
