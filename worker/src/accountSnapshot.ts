import { quoteAmount, type PositionState } from "./positions";
import type { WorkerMarket } from "./markets";

export interface SnapshotPositionInput {
	asset: string;
	state: PositionState;
	available: bigint;
	locked: bigint;
	partial?: boolean;
}

export interface AccountSnapshotInput {
	userId: string;
	at: number;
	quoteAsset: string;
	quotePrecision: number;
	cash: bigint;
	contributions: bigint;
	positions: SnapshotPositionInput[];
	prices: ReadonlyMap<string, bigint>;
	markets: ReadonlyMap<string, WorkerMarket>;
}

export interface AccountSnapshotPosition {
	asset: string;
	symbol: string | null;
	qtyPrecision: number;
	qty: string;
	available: string;
	locked: string;
	costBasis: string;
	averageCost: string | null;
	markPrice: string | null;
	value: string;
	realizedPnl: string;
	unrealizedPnl: string;
	lastBuyPrice: string | null;
	lastBuyQty: string | null;
	lastBuyAt: number | null;
	lastSellPrice: string | null;
	lastSellQty: string | null;
	lastSellAt: number | null;
	tradeCount: number;
}

export interface AccountSnapshot {
	userId: string;
	at: number;
	quoteAsset: string;
	quotePrecision: number;
	cash: string;
	positionsValue: string;
	equity: string;
	costBasis: string;
	realizedPnl: string;
	unrealizedPnl: string;
	netContributions: string;
	totalPnl: string;
	partial: boolean;
	positions: AccountSnapshotPosition[];
}

function baseAssetIndex(markets: ReadonlyMap<string, WorkerMarket>) {
	const assets = new Map<string, WorkerMarket>();

	for (const market of markets.values()) {
		if (!assets.has(market.baseAsset)) assets.set(market.baseAsset, market);
	}

	return assets;
}

function averageCost(state: PositionState, qtyPrecision: number) {
	if (state.qty <= 0n) return null;
	return (state.costBasis * 10n ** BigInt(qtyPrecision)) / state.qty;
}

export function buildAccountSnapshot(input: AccountSnapshotInput): AccountSnapshot {
	const assets = baseAssetIndex(input.markets);
	const positions: AccountSnapshotPosition[] = [];
	let positionsValue = 0n;
	let costBasis = 0n;
	let realizedPnl = 0n;
	let unrealizedPnl = 0n;
	let partial = false;

	for (const item of input.positions) {
		const { state } = item;
		const market = assets.get(item.asset);
		const qtyPrecision = market?.qtyPrecision ?? 0;
		const lastPrice = market ? input.prices.get(market.symbol) : undefined;
		const average = averageCost(state, qtyPrecision);
		const markPrice = lastPrice ?? average ?? null;

		if (item.partial || (market != null && lastPrice == null && state.qty > 0n)) {
			partial = true;
		}

		const value =
			markPrice == null ? 0n : quoteAmount(markPrice, state.qty, qtyPrecision);
		const unrealized =
			state.qty > 0n && markPrice != null ? value - state.costBasis : 0n;

		positionsValue += value;
		costBasis += state.costBasis;
		realizedPnl += state.realizedPnl;
		unrealizedPnl += unrealized;
		partial ||= state.qty < 0n;

		positions.push({
			asset: item.asset,
			symbol: market?.symbol ?? null,
			qtyPrecision,
			qty: state.qty.toString(),
			available: item.available.toString(),
			locked: item.locked.toString(),
			costBasis: state.costBasis.toString(),
			averageCost: average?.toString() ?? null,
			markPrice: markPrice?.toString() ?? null,
			value: value.toString(),
			realizedPnl: state.realizedPnl.toString(),
			unrealizedPnl: unrealized.toString(),
			lastBuyPrice: state.lastBuyPrice?.toString() ?? null,
			lastBuyQty: state.lastBuyQty?.toString() ?? null,
			lastBuyAt: state.lastBuyAt,
			lastSellPrice: state.lastSellPrice?.toString() ?? null,
			lastSellQty: state.lastSellQty?.toString() ?? null,
			lastSellAt: state.lastSellAt,
			tradeCount: state.tradeCount,
		});
	}

	positions.sort((a, b) => a.asset.localeCompare(b.asset));

	const equity = input.cash + positionsValue;

	return {
		userId: input.userId,
		at: input.at,
		quoteAsset: input.quoteAsset,
		quotePrecision: input.quotePrecision,
		cash: input.cash.toString(),
		positionsValue: positionsValue.toString(),
		equity: equity.toString(),
		costBasis: costBasis.toString(),
		realizedPnl: realizedPnl.toString(),
		unrealizedPnl: unrealizedPnl.toString(),
		netContributions: input.contributions.toString(),
		totalPnl: (equity - input.contributions).toString(),
		partial,
		positions,
	};
}
