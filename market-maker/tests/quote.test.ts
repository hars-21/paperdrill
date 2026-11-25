import { expect, test } from "bun:test";
import { applyBps } from "../src/decimal";
import { buildLadder, inventorySkewBps, planRequotes, type QuoteMarket } from "../src/quote";
import type { MakerOrder } from "../src/types";

const anchor = 6_750_025n; // 67500.25

const market: QuoteMarket = {
	symbol: "BTC_USD",
	pricePrecision: 2,
	qtyPrecision: 4,
	levelsPerSide: 3,
	spreadBps: 20,
	levelStepBps: 10,
	driftBps: 8,
	maxSkewBps: 30,
	staleOrderMs: 30_000,
	maxOrderNotional: 100,
	maxInventoryNotional: 400,
};

const now = 1_000_000;

function order(overrides: Partial<MakerOrder> = {}): MakerOrder {
	return {
		id: "order-1",
		userId: "service-1",
		side: "BUY",
		type: "LIMIT",
		symbol: "BTC_USD",
		price: applyBps(anchor, -10),
		qty: 15n,
		filledQty: 0n,
		status: "OPEN",
		createdAt: now - 1_000,
		...overrides,
	};
}

test("ladder keeps bids below and asks above the anchor", () => {
	const ladder = buildLadder(market, anchor, { base: 10, quote: 10_000 });
	const bids = ladder.filter((q) => q.side === "BUY");
	const asks = ladder.filter((q) => q.side === "SELL");

	expect(ladder).toHaveLength(6);
	expect(bids.every((q) => q.priceScaled < anchor)).toBe(true);
	expect(asks.every((q) => q.priceScaled > anchor)).toBe(true);
	expect(bids[0]!.priceScaled).toBeGreaterThan(bids[1]!.priceScaled);
	expect(asks[0]!.priceScaled).toBeLessThan(asks[1]!.priceScaled);
	expect(ladder.every((q) => q.qtyScaled > 0n)).toBe(true);
});

test("order size respects the notional cap", () => {
	const ladder = buildLadder(market, anchor, { base: 10, quote: 10_000 });
	for (const quote of ladder) {
		const notional = Number(quote.priceScaled * quote.qtyScaled) / 10 ** 6;
		expect(notional).toBeLessThanOrEqual(market.maxOrderNotional + 1);
	}
});

test("holding more base skews quotes lower to shed inventory", () => {
	// Half of the inventory target is the neutral base position (about 200 USD).
	const neutralBase = 200 / 67_500.25;
	const neutral = buildLadder(market, anchor, { base: neutralBase, quote: 10_000 });
	const longBase = buildLadder(market, anchor, { base: 2, quote: 10_000 });

	expect(inventorySkewBps(anchor, { base: 2, quote: 10_000 }, market)).toBeGreaterThan(0);
	expect(longBase.find((q) => q.side === "SELL")!.priceScaled).toBeLessThan(
		neutral.find((q) => q.side === "SELL")!.priceScaled,
	);
	expect(longBase.find((q) => q.side === "BUY")!.priceScaled).toBeLessThan(
		neutral.find((q) => q.side === "BUY")!.priceScaled,
	);
});

test("an aligned, fresh order is left alone", () => {
	const ladder = buildLadder(market, anchor, { base: 0, quote: 10_000 });
	const bestBid = ladder.find((q) => q.side === "BUY")!;
	const plan = planRequotes(
		market,
		[bestBid],
		[order({ price: bestBid.priceScaled, qty: bestBid.qtyScaled })],
		now,
	);

	expect(plan.cancel).toHaveLength(0);
	expect(plan.create).toHaveLength(0);
});

test("drifted, stale and extra orders are cancelled and replaced", () => {
	const ladder = buildLadder(market, anchor, { base: 0, quote: 10_000 });
	const bestBid = ladder.find((q) => q.side === "BUY")!;
	const plan = planRequotes(
		market,
		[bestBid],
		[
			order({ id: "drifted", price: applyBps(anchor, -100), qty: bestBid.qtyScaled }),
			order({ id: "stale", createdAt: now - 60_000, qty: bestBid.qtyScaled }),
			order({ id: "extra", price: applyBps(anchor, -500), qty: bestBid.qtyScaled }),
		],
		now,
	);

	expect(new Set(plan.cancel.map((o) => o.id))).toEqual(new Set(["drifted", "stale", "extra"]));
	expect(plan.create).toHaveLength(1);
	expect(plan.create[0]?.priceScaled).toBe(bestBid.priceScaled);
});

test("a partially filled order with the wrong remaining size is requoted", () => {
	const ladder = buildLadder(market, anchor, { base: 0, quote: 10_000 });
	const bestBid = ladder.find((q) => q.side === "BUY")!;
	const plan = planRequotes(
		market,
		[bestBid],
		[order({ price: bestBid.priceScaled, qty: 100n, filledQty: 90n })],
		now,
	);

	expect(plan.cancel).toHaveLength(1);
	expect(plan.create).toHaveLength(1);
});

test("missing levels are created", () => {
	const ladder = buildLadder(market, anchor, { base: 0, quote: 10_000 });
	const plan = planRequotes(market, ladder, [], now);

	expect(plan.cancel).toHaveLength(0);
	expect(plan.create).toHaveLength(ladder.length);
});
