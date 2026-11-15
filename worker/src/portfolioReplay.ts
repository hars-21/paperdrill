import {
	applyPositionChange,
	emptyPosition,
	positionKey,
	quoteAmount,
	type PositionEventRecord,
	type PositionSide,
	type PositionState,
} from "./positions";
import type { WorkerMarket } from "./markets";

export interface ReplayFill {
	id: string;
	symbol: string;
	price: string;
	qty: string;
	buyerId: string;
	sellerId: string;
	createdAt: number;
}

export interface ReplayBalance {
	userId: string;
	asset: string;
	available: bigint;
	locked: bigint;
}

export interface ReplayPosition {
	userId: string;
	asset: string;
	state: PositionState;
}

export interface UnpricedResidual {
	userId: string;
	asset: string;
	symbol: string;
	qty: bigint;
}

export interface BalanceDrift {
	userId: string;
	asset: string;
	projected: bigint;
	balance: bigint;
}

export type MarketLookup = ReadonlyMap<string, WorkerMarket>;

function baseAssetIndex(markets: MarketLookup) {
	const assets = new Map<string, WorkerMarket>();

	for (const market of markets.values()) {
		if (!assets.has(market.baseAsset)) assets.set(market.baseAsset, market);
	}

	return assets;
}

function addQuantity(map: Map<string, bigint>, key: string, qty: bigint) {
	map.set(key, (map.get(key) ?? 0n) + qty);
}

export function computeNetQuantities(
	fills: ReplayFill[],
	markets: MarketLookup,
	knownUsers: ReadonlySet<string>,
) {
	const net = new Map<string, bigint>();

	for (const fill of fills) {
		const market = markets.get(fill.symbol);
		if (!market) continue;

		const qty = BigInt(fill.qty);
		if (knownUsers.has(fill.buyerId)) {
			addQuantity(net, positionKey(fill.buyerId, market.baseAsset), qty);
		}
		if (knownUsers.has(fill.sellerId)) {
			addQuantity(net, positionKey(fill.sellerId, market.baseAsset), -qty);
		}
	}

	return net;
}

/**
 * Balances that cannot be explained by the fill ledger are treated as opening
 * holdings. They are valued at the latest known price so a missing fill does
 * not turn into free cost basis and inflate realised PnL.
 */
export function buildSeedPositions(
	balances: ReplayBalance[],
	netQuantities: ReadonlyMap<string, bigint>,
	prices: ReadonlyMap<string, bigint>,
	markets: MarketLookup,
	knownUsers: ReadonlySet<string>,
) {
	const assets = baseAssetIndex(markets);
	const positions: ReplayPosition[] = [];
	const unpriced: UnpricedResidual[] = [];

	for (const balance of balances) {
		if (!knownUsers.has(balance.userId)) continue;

		const market = assets.get(balance.asset);
		if (!market) continue;

		const total = balance.available + balance.locked;
		const net = netQuantities.get(positionKey(balance.userId, balance.asset)) ?? 0n;
		const residual = total - net;
		if (residual <= 0n) continue;

		const price = prices.get(market.symbol);
		if (price == null) {
			unpriced.push({
				userId: balance.userId,
				asset: balance.asset,
				symbol: market.symbol,
				qty: residual,
			});
			continue;
		}

		positions.push({
			userId: balance.userId,
			asset: balance.asset,
			state: {
				...emptyPosition(),
				qty: residual,
				costBasis: quoteAmount(price, residual, market.qtyPrecision),
			},
		});
	}

	return { positions, unpriced };
}

export function replayFills(
	fills: ReplayFill[],
	seedPositions: ReplayPosition[],
	markets: MarketLookup,
	knownUsers: ReadonlySet<string>,
) {
	const state = new Map<string, PositionState>();
	const owners = new Map<string, { userId: string; asset: string }>();
	const events: PositionEventRecord[] = [];

	const track = (userId: string, asset: string, next: PositionState) => {
		const key = positionKey(userId, asset);
		state.set(key, next);
		owners.set(key, { userId, asset });
	};

	for (const seed of seedPositions) track(seed.userId, seed.asset, seed.state);

	for (const fill of fills) {
		const market = markets.get(fill.symbol);
		if (!market) continue;

		const price = BigInt(fill.price);
		const qty = BigInt(fill.qty);

		const apply = (userId: string, side: PositionSide) => {
			if (!knownUsers.has(userId)) return;

			const key = positionKey(userId, market.baseAsset);
			const before = state.get(key) ?? emptyPosition();
			const change = applyPositionChange(before, {
				fillId: fill.id,
				userId,
				asset: market.baseAsset,
				symbol: fill.symbol,
				side,
				price,
				qty,
				occurredAt: fill.createdAt,
				qtyPrecision: market.qtyPrecision,
			});

			track(userId, market.baseAsset, change.after);
			events.push(change.event);
		};

		apply(fill.buyerId, "BUY");
		apply(fill.sellerId, "SELL");
	}

	const positions = [...state.entries()]
		.map(([key, value]) => {
			const owner = owners.get(key);
			if (!owner) return null;
			return { ...owner, state: value };
		})
		.filter((position): position is ReplayPosition => position != null)
		.sort((a, b) =>
			a.userId === b.userId
				? a.asset.localeCompare(b.asset)
				: a.userId.localeCompare(b.userId),
		);

	return { positions, events };
}

export function diffBalanceQuantities(
	positions: ReplayPosition[],
	balances: ReplayBalance[],
	markets: MarketLookup,
	knownUsers: ReadonlySet<string>,
) {
	const assets = baseAssetIndex(markets);
	const projected = new Map<string, bigint>();
	const actual = new Map<string, bigint>();
	const owners = new Map<string, { userId: string; asset: string }>();

	for (const position of positions) {
		const key = positionKey(position.userId, position.asset);
		projected.set(key, position.state.qty);
		owners.set(key, { userId: position.userId, asset: position.asset });
	}

	for (const balance of balances) {
		if (!knownUsers.has(balance.userId)) continue;
		if (!assets.has(balance.asset)) continue;

		const key = positionKey(balance.userId, balance.asset);
		actual.set(key, balance.available + balance.locked);
		owners.set(key, { userId: balance.userId, asset: balance.asset });
	}

	const drift: BalanceDrift[] = [];
	for (const key of new Set([...projected.keys(), ...actual.keys()])) {
		const owner = owners.get(key);
		if (!owner) continue;

		const left = projected.get(key) ?? 0n;
		const right = actual.get(key) ?? 0n;
		if (left === right) continue;

		drift.push({ ...owner, projected: left, balance: right });
	}

	return drift.sort((a, b) =>
		a.userId === b.userId ? a.asset.localeCompare(b.asset) : a.userId.localeCompare(b.userId),
	);
}
