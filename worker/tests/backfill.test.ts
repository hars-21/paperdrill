import { expect, test } from "bun:test";
import type { WorkerMarket } from "../src/markets";
import { positionKey } from "../src/positions";
import {
	buildSeedPositions,
	computeNetQuantities,
	diffBalanceQuantities,
	replayFills,
	type ReplayBalance,
	type ReplayFill,
} from "../src/portfolioReplay";

const BTC: WorkerMarket = {
	symbol: "BTC_USD",
	baseAsset: "BTC",
	quoteAsset: "USD",
	pricePrecision: 2,
	qtyPrecision: 4,
};

const markets = new Map([["BTC_USD", BTC]]);
const users = new Set(["buyer", "seller"]);

function fill(overrides: Partial<ReplayFill> = {}): ReplayFill {
	return {
		id: crypto.randomUUID(),
		symbol: "BTC_USD",
		price: "2000000",
		qty: "5000",
		buyerId: "buyer",
		sellerId: "seller",
		createdAt: 1_000,
		...overrides,
	};
}

test("net quantities add buys and subtract sells for known users", () => {
	const net = computeNetQuantities(
		[fill(), fill({ qty: "2000", sellerId: "outsider", createdAt: 2_000 })],
		markets,
		users,
	);

	expect(net.get(positionKey("buyer", "BTC"))).toBe(7_000n);
	expect(net.get(positionKey("seller", "BTC"))).toBe(-5_000n);
	expect(net.get(positionKey("outsider", "BTC"))).toBeUndefined();
});

test("residual balances seed opening positions at the latest price", () => {
	const balances: ReplayBalance[] = [
		{ userId: "buyer", asset: "BTC", available: 2_500n, locked: 500n },
		{ userId: "buyer", asset: "USD", available: 10_000n, locked: 0n },
		{ userId: "seller", asset: "BTC", available: 1_000n, locked: 0n },
		{ userId: "outsider", asset: "BTC", available: 1_000n, locked: 0n },
	];

	const { positions, unpriced } = buildSeedPositions(
		balances,
		new Map([[positionKey("buyer", "BTC"), 2_000n]]),
		new Map([["BTC_USD", 2_000_000n]]),
		markets,
		users,
	);

	expect(positions).toHaveLength(2);
	expect(positions.find((position) => position.userId === "buyer")).toMatchObject({
		asset: "BTC",
		state: { qty: 1_000n, costBasis: 200_000n, realizedPnl: 0n },
	});
	expect(unpriced).toHaveLength(0);
});

test("residual balances without a price are reported instead of seeded", () => {
	const { positions, unpriced } = buildSeedPositions(
		[{ userId: "buyer", asset: "BTC", available: 1_000n, locked: 0n }],
		new Map(),
		new Map(),
		markets,
		users,
	);

	expect(positions).toHaveLength(0);
	expect(unpriced).toEqual([
		{ userId: "buyer", asset: "BTC", symbol: "BTC_USD", qty: 1_000n },
	]);
});

test("replay starts from seeds and realises profit on later sells", () => {
	const seeds = [
		{
			userId: "buyer",
			asset: "BTC",
			state: {
				qty: 1_000n,
				costBasis: 200_000n,
				realizedPnl: 0n,
				lastBuyPrice: null,
				lastBuyQty: null,
				lastBuyAt: null,
				lastSellPrice: null,
				lastSellQty: null,
				lastSellAt: null,
				tradeCount: 0,
			},
		},
	];

	const { positions, events } = replayFills(
		[
			fill({ id: "buy", qty: "1000", createdAt: 2_000 }),
			fill({
				id: "sell",
				buyerId: "seller",
				sellerId: "buyer",
				price: "3000000",
				qty: "1000",
				createdAt: 3_000,
			}),
		],
		seeds,
		markets,
		users,
	);

	expect(positions.find((position) => position.userId === "buyer")).toMatchObject({
		state: {
			qty: 1_000n,
			costBasis: 200_000n,
			realizedPnl: 100_000n,
			lastBuyPrice: 2_000_000n,
			lastSellPrice: 3_000_000n,
			lastSellAt: 3_000,
			tradeCount: 2,
		},
	});

	const sell = events.find(
		(event) => event.userId === "buyer" && event.side === "SELL",
	);
	expect(sell).toMatchObject({
		fillId: "sell",
		quoteAmount: 300_000n,
		costBasisBefore: 400_000n,
		costBasisAfter: 200_000n,
		realizedPnl: 100_000n,
	});
});

test("balance drift compares base-asset quantities only", () => {
	const positions = [
		{
			userId: "buyer",
			asset: "BTC",
			state: {
				qty: 1_000n,
				costBasis: 200_000n,
				realizedPnl: 0n,
				lastBuyPrice: null,
				lastBuyQty: null,
				lastBuyAt: null,
				lastSellPrice: null,
				lastSellQty: null,
				lastSellAt: null,
				tradeCount: 0,
			},
		},
	];

	const drift = diffBalanceQuantities(
		positions,
		[
			{ userId: "buyer", asset: "BTC", available: 1_000n, locked: 0n },
			{ userId: "seller", asset: "BTC", available: 500n, locked: 0n },
			{ userId: "buyer", asset: "USD", available: 9_999n, locked: 0n },
		],
		markets,
		users,
	);

	expect(drift).toEqual([
		{ userId: "seller", asset: "BTC", projected: 0n, balance: 500n },
	]);
});
