import { ASSETS, BALANCES } from "../store";
import type { CreateOrderInput, InternalOrder, Fill, UserBalance } from "../types/domain";
import { getMarket } from "./market";

export interface LockResult {
	asset: string;
	locked: bigint;
}

export interface SettleResult {
	id: string;
	cost: bigint;
	quoteAsset: string;
	baseAsset: string;
}

export interface ReleaseResult {
	asset: string;
	released: bigint;
}

function qtyScale(qtyPrecision: number): bigint {
	return 10n ** BigInt(qtyPrecision);
}

function getAssetBalance(balance: UserBalance, asset: string) {
	const assetBalance = balance[asset];
	if (!assetBalance) throw new Error(`Missing balance for asset: ${asset}`);
	return assetBalance;
}

function ensureAssetBalance(balance: UserBalance, asset: string) {
	return (balance[asset] ??= { available: 0n, locked: 0n });
}

export function initializeUserBalance(userId: string, asset: string, amount: bigint) {
	if (!ASSETS.has(asset)) {
		throw new Error(`Unknown asset: ${asset}`);
	}

	if (!BALANCES[userId]) {
		BALANCES[userId] = {
			[asset]: { available: amount, locked: 0n },
		};
	}

	return BALANCES[userId];
}

export function addBalance(userId: string, asset: string, amount: bigint) {
	if (!ASSETS.has(asset)) {
		throw new Error(`Unknown asset: ${asset}`);
	}

	const userBalance = (BALANCES[userId] ??= {});
	const assetBalance = ensureAssetBalance(userBalance, asset);
	assetBalance.available += amount;

	return { [asset]: assetBalance };
}

export function getUserBalance(userId: string, asset?: string): UserBalance {
	const userBalance = BALANCES[userId] ?? {};

	if (asset) {
		const assetBalance = userBalance[asset];
		return assetBalance ? { [asset]: assetBalance } : {};
	}

	return userBalance;
}

export function lockBalance(order: CreateOrderInput): LockResult {
	const { userId, side, type, symbol, price, qty } = order;

	const market = getMarket(symbol);
	const userBalance = getUserBalance(userId);

	if (side === "BUY") {
		const quote = userBalance[market.quoteAsset];
		const scale = qtyScale(market.qtyPrecision);
		let lockAmount: bigint;

		if (type === "LIMIT") {
			if (price == null) throw new Error("LIMIT order must have price");
			lockAmount = (price * qty) / scale;
		} else {
			const bestAsk = market.bestAsk;
			if (bestAsk == null) throw new Error("No liquidity");
			lockAmount = (((bestAsk * qty) / scale) * 11n) / 10n;
		}

		if (!quote || quote.available < lockAmount) {
			throw new Error("Insufficient balance");
		}

		quote.available -= lockAmount;
		quote.locked += lockAmount;

		return {
			asset: market.quoteAsset,
			locked: lockAmount,
		};
	} else {
		const base = userBalance[market.baseAsset];
		if (type === "MARKET" && market.bestBid == null) {
			throw new Error("No liquidity");
		}

		if (!base || base.available < qty) {
			throw new Error("Insufficient balance");
		}

		base.available -= qty;
		base.locked += qty;

		return { asset: market.baseAsset, locked: qty };
	}
}

export function settleFills(fills: Fill[]): SettleResult[] {
	const results: SettleResult[] = [];

	for (const fill of fills) {
		const { buyerId, sellerId, qty, price, symbol } = fill;

		const market = getMarket(symbol);

		const buyerBalance = getUserBalance(buyerId);
		const sellerBalance = getUserBalance(sellerId);

		const buyerQuote = getAssetBalance(buyerBalance, market.quoteAsset);
		const sellerQuote = ensureAssetBalance(sellerBalance, market.quoteAsset);

		const buyerBase = ensureAssetBalance(buyerBalance, market.baseAsset);
		const sellerBase = getAssetBalance(sellerBalance, market.baseAsset);

		const scale = qtyScale(market.qtyPrecision);
		const cost = (qty * price) / scale;

		buyerQuote.locked -= cost;
		sellerQuote.available += cost;

		sellerBase.locked -= qty;
		buyerBase.available += qty;

		results.push({
			id: fill.id,
			cost,
			quoteAsset: market.quoteAsset,
			baseAsset: market.baseAsset,
		});
	}

	return results;
}

export function releaseBalance(order: InternalOrder): ReleaseResult {
	const { side, symbol, qty, filledQty, lockedAmount, spentAmount } = order;

	const market = getMarket(symbol);
	const userBalance = getUserBalance(order.userId);

	if (side === "BUY") {
		const quote = getAssetBalance(userBalance, market.quoteAsset);
		const remaining = lockedAmount! - spentAmount;

		if (remaining < 0) throw new Error("Invalid remaining amount");
		if (quote.locked < remaining) throw new Error("Insufficient Locked Balance");

		quote.locked -= remaining;
		quote.available += remaining;

		return { asset: market.quoteAsset, released: remaining };
	} else {
		const base = getAssetBalance(userBalance, market.baseAsset);
		const remainingQty = qty - filledQty;

		if (base.locked < remainingQty) throw new Error("Insufficient Locked Balance");

		base.locked -= remainingQty;
		base.available += remainingQty;

		return { asset: market.baseAsset, released: remainingQty };
	}
}
