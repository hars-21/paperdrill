import { expect, test } from "bun:test";
import type { CommandWriter } from "../src/engine";
import { runMarketCycle } from "../src/runner";
import { MakerState } from "../src/state";
import type { FundableMarket } from "../src/funding";

const anchor = 6_750_025n;
const userId = "service-1";

const market: FundableMarket = {
	symbol: "BTC_USD",
	baseAsset: "BTC",
	quoteAsset: "USD",
	pricePrecision: 2,
	qtyPrecision: 4,
	levelsPerSide: 2,
	spreadBps: 20,
	levelStepBps: 10,
	driftBps: 8,
	maxSkewBps: 30,
	staleOrderMs: 30_000,
	maxOrderNotional: 100,
	maxInventoryNotional: 400,
};

interface Calls {
	creates: Record<string, string>[];
	cancels: string[];
	deposits: { asset: string; amount: string }[];
}

function fakeWriter(calls: Calls): CommandWriter {
	return {
		createOrder: async (input) => {
			calls.creates.push({ side: input.side, price: input.priceScaled.toString() });
			return "1-0";
		},
		cancelOrder: async (input) => {
			calls.cancels.push(input.id);
			return "1-0";
		},
		deposit: async (input) => {
			calls.deposits.push({ asset: input.asset, amount: input.amountScaled.toString() });
			return "1-0";
		},
	};
}

function emptyCalls(): Calls {
	return { creates: [], cancels: [], deposits: [] };
}

test("a funded market gets a full ladder without deposits", async () => {
	const state = new MakerState(new Set([userId]));
	state.credit(userId, "BTC", 20_000n);
	state.credit(userId, "USD", 2_000_000n);
	const calls = emptyCalls();

	const result = await runMarketCycle({
		market,
		userId,
		anchorScaled: anchor,
		maxTopUpNotional: 500,
		writer: fakeWriter(calls),
		state,
		now: 1_000_000,
	});

	expect(result).toEqual({ cancelled: 0, created: 4 });
	expect(calls.deposits).toEqual([]);
	expect(calls.creates.filter((order) => order.side === "BUY")).toHaveLength(2);
	expect(calls.creates.filter((order) => order.side === "SELL")).toHaveLength(2);
});

test("unfunded accounts are topped up within the configured cap", async () => {
	const state = new MakerState(new Set([userId]));
	const calls = emptyCalls();

	await runMarketCycle({
		market,
		userId,
		anchorScaled: anchor,
		maxTopUpNotional: 0.5,
		writer: fakeWriter(calls),
		state,
		now: 1_000_000,
	});

	expect(calls.deposits).toHaveLength(2);
	expect(calls.deposits.every((deposit) => Number(deposit.amount))).toBe(true);
	expect(Number(calls.deposits[0]!.amount)).toBeLessThanOrEqual(5_000);
	expect(Number(calls.deposits[1]!.amount)).toBeLessThanOrEqual(50_000);
});

test("stale quotes are cancelled before fresh replacements are posted", async () => {
	const state = new MakerState(new Set([userId]));
	state.credit(userId, "BTC", 20_000n);
	state.credit(userId, "USD", 2_000_000n);
	state.apply({
		id: "event-1",
		type: "order.created",
		version: 1,
		occurredAt: 1,
		event: {
			type: "order.created",
			order: {
				id: "old-order",
				userId,
				side: "BUY",
				type: "LIMIT",
				symbol: market.symbol,
				price: anchor,
				qty: 14n,
				filledQty: 0n,
				status: "OPEN",
				createdAt: 0,
			},
		},
	});
	const calls = emptyCalls();

	const result = await runMarketCycle({
		market,
		userId,
		anchorScaled: anchor,
		maxTopUpNotional: 500,
		writer: fakeWriter(calls),
		state,
		now: 1_000_000,
	});

	expect(result.cancelled).toBe(1);
	expect(calls.cancels).toEqual(["old-order"]);
	expect(state.orderCount).toBe(0);
});
