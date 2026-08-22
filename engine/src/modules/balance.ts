import { BALANCES, ORDERBOOK } from "../store";
import type { CreateOrderInput, InternalOrder, Fill, UserBalance } from "../types/domain";

export interface LockResult {
	asset: string;
	locked: bigint;
}

export interface SettleResult {
	fillId: string;
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

function initializeBalance(): UserBalance {
	return {
		USD: { available: 10000000n, locked: 0n },
		BTC: { available: 100000n, locked: 0n },
		SOL: { available: 100000n, locked: 0n },
		ETH: { available: 100000n, locked: 0n },
	};
}

export function getUserBalance(userId: string): UserBalance {
	if (!BALANCES[userId]) {
		BALANCES[userId] = initializeBalance();
	}

	return BALANCES[userId];
}

export function lockBalance(order: CreateOrderInput): LockResult {
	const { userId, side, type, symbol, price, qty } = order;

	const market = ORDERBOOK[symbol];
	const userBalance = getUserBalance(userId);

	const base = userBalance[market.baseAsset];
	const quote = userBalance[market.quoteAsset];

	if (side === "BUY") {
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

		if (quote.available < lockAmount) {
			throw new Error("Insufficient balance");
		}

		quote.available -= lockAmount;
		quote.locked += lockAmount;

		return {
			asset: market.quoteAsset,
			locked: lockAmount,
		};
	} else {
		if (type === "MARKET" && market.bestBid == null) {
			throw new Error("No liquidity");
		}

		if (base.available < qty) {
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

		const market = ORDERBOOK[symbol];

		const buyerBalance = getUserBalance(buyerId);
		const sellerBalance = getUserBalance(sellerId);

		const buyerQuote = buyerBalance[market.quoteAsset];
		const sellerQuote = sellerBalance[market.quoteAsset];

		const buyerBase = buyerBalance[market.baseAsset];
		const sellerBase = sellerBalance[market.baseAsset];

		const scale = qtyScale(market.qtyPrecision);
		const cost = (qty * price) / scale;

		buyerQuote.locked -= cost;
		sellerQuote.available += cost;

		sellerBase.locked -= qty;
		buyerBase.available += qty;

		results.push({
			fillId: fill.fillId,
			cost,
			quoteAsset: market.quoteAsset,
			baseAsset: market.baseAsset,
		});
	}

	return results;
}

export function releaseBalance(order: InternalOrder): ReleaseResult {
	const { side, symbol, qty, filledQty, lockedAmount, spentAmount } = order;

	const market = ORDERBOOK[symbol];
	const userBalance = getUserBalance(order.userId);

	const quote = userBalance[market.quoteAsset];
	const base = userBalance[market.baseAsset];

	if (side === "BUY") {
		const remaining = lockedAmount! - spentAmount;

		if (remaining < 0) throw new Error("Invalid remaining amount");
		if (quote.locked < remaining) throw new Error("Insufficient Locked Balance");

		quote.locked -= remaining;
		quote.available += remaining;

		return { asset: market.quoteAsset, released: remaining };
	} else {
		const remainingQty = qty - filledQty;

		if (base.locked < remainingQty) throw new Error("Insufficient Locked Balance");

		base.locked -= remainingQty;
		base.available += remainingQty;

		return { asset: market.baseAsset, released: remainingQty };
	}
}
