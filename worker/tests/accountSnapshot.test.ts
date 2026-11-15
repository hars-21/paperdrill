import { expect, test } from "bun:test";
import { buildAccountSnapshot, type SnapshotPositionInput } from "../src/accountSnapshot";
import type { WorkerMarket } from "../src/markets";
import { emptyPosition, type PositionState } from "../src/positions";

const BTC: WorkerMarket = {
	symbol: "BTC_USD",
	baseAsset: "BTC",
	quoteAsset: "USD",
	pricePrecision: 2,
	qtyPrecision: 4,
};

const markets = new Map([["BTC_USD", BTC]]);

function position(
	overrides: {
		state?: Partial<PositionState>;
		available?: bigint;
		locked?: bigint;
		partial?: boolean;
	} = {},
): SnapshotPositionInput {
	return {
		asset: "BTC",
		state: {
			...emptyPosition(),
			qty: 5_000n,
			costBasis: 1_000_000n,
			lastBuyPrice: 2_000_000n,
			lastBuyQty: 5_000n,
			lastBuyAt: 1_000,
			tradeCount: 1,
			...overrides.state,
		},
		available: overrides.available ?? 5_000n,
		locked: overrides.locked ?? 0n,
		partial: overrides.partial,
	};
}

test("snapshot values open positions at the latest mark and splits PnL", () => {
	const snapshot = buildAccountSnapshot({
		userId: "user-1",
		at: 2_000,
		quoteAsset: "USD",
		quotePrecision: 2,
		cash: 9_000_000n,
		contributions: 10_000_000n,
		positions: [position()],
		prices: new Map([["BTC_USD", 2_400_000n]]),
		markets,
	});

	expect(snapshot).toMatchObject({
		cash: "9000000",
		positionsValue: "1200000",
		equity: "10200000",
		costBasis: "1000000",
		realizedPnl: "0",
		unrealizedPnl: "200000",
		netContributions: "10000000",
		totalPnl: "200000",
		partial: false,
	});
	expect(snapshot.positions[0]).toMatchObject({
		asset: "BTC",
		qty: "5000",
		averageCost: "2000000",
		markPrice: "2400000",
		value: "1200000",
		unrealizedPnl: "200000",
	});
});

test("missing marks fall back to average cost and flag the snapshot partial", () => {
	const snapshot = buildAccountSnapshot({
		userId: "user-1",
		at: 2_000,
		quoteAsset: "USD",
		quotePrecision: 2,
		cash: 9_000_000n,
		contributions: 10_000_000n,
		positions: [position()],
		prices: new Map(),
		markets,
	});

	expect(snapshot.partial).toBe(true);
	expect(snapshot.unrealizedPnl).toBe("0");
	expect(snapshot.positions[0]?.markPrice).toBe("2000000");
});

test("closed positions keep realised PnL but do not affect equity", () => {
	const snapshot = buildAccountSnapshot({
		userId: "user-1",
		at: 2_000,
		quoteAsset: "USD",
		quotePrecision: 2,
		cash: 10_250_000n,
		contributions: 10_000_000n,
		positions: [
			position({
				state: {
					qty: 0n,
					costBasis: 0n,
					realizedPnl: 250_000n,
					tradeCount: 2,
					lastBuyPrice: null,
					lastBuyQty: null,
					lastBuyAt: null,
				},
				available: 0n,
			}),
		],
		prices: new Map([["BTC_USD", 2_400_000n]]),
		markets,
	});

	expect(snapshot).toMatchObject({
		positionsValue: "0",
		equity: "10250000",
		realizedPnl: "250000",
		unrealizedPnl: "0",
		totalPnl: "250000",
	});
	expect(snapshot.positions[0]).toMatchObject({
		qty: "0",
		averageCost: null,
		value: "0",
	});
});

test("balances without a projected position are valued but marked partial", () => {
	const snapshot = buildAccountSnapshot({
		userId: "user-1",
		at: 2_000,
		quoteAsset: "USD",
		quotePrecision: 2,
		cash: 9_000_000n,
		contributions: 10_000_000n,
		positions: [
			{
				asset: "BTC",
				state: { ...emptyPosition(), qty: 2_500n },
				available: 2_500n,
				locked: 0n,
				partial: true,
			},
		],
		prices: new Map([["BTC_USD", 2_400_000n]]),
		markets,
	});

	expect(snapshot.partial).toBe(true);
	expect(snapshot.positionsValue).toBe("600000");
	expect(snapshot.unrealizedPnl).toBe("600000");
});
