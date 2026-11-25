import { applyBps, clamp, divRound, scaledDown, toNumber } from "./decimal";
import type { MakerOrder, OrderSide } from "./types";

export interface QuoteMarket {
	symbol: string;
	pricePrecision: number;
	qtyPrecision: number;
	levelsPerSide: number;
	spreadBps: number;
	levelStepBps: number;
	driftBps: number;
	maxSkewBps: number;
	staleOrderMs: number;
	maxOrderNotional: number;
	maxInventoryNotional: number;
}

export interface AvailableBalances {
	base: number;
	quote: number;
}

export interface Quote {
	level: number;
	side: OrderSide;
	priceScaled: bigint;
	qtyScaled: bigint;
}

export interface RequotePlan {
	cancel: MakerOrder[];
	create: Quote[];
}

export function inventorySkewBps(
	anchorScaled: bigint,
	available: AvailableBalances,
	market: QuoteMarket,
): number {
	const anchor = toNumber(anchorScaled, market.pricePrecision);
	const baseNotional = available.base * anchor;
	const neutralNotional = market.maxInventoryNotional / 2;
	if (neutralNotional <= 0) return 0;

	return Math.round(
		clamp(
			((baseNotional - neutralNotional) / neutralNotional) * market.maxSkewBps,
			-market.maxSkewBps,
			market.maxSkewBps,
		),
	);
}

function quoteQty(
	side: OrderSide,
	price: bigint,
	available: AvailableBalances,
	market: QuoteMarket,
): bigint {
	const priceNumber = toNumber(price, market.pricePrecision);
	if (!Number.isFinite(priceNumber) || priceNumber <= 0) return 0n;

	const notionalCap = market.maxOrderNotional / priceNumber;
	const balanceCap = side === "BUY" ? available.quote / priceNumber : available.base;
	const quantity = Math.max(0, Math.min(notionalCap, balanceCap));
	return scaledDown(quantity, market.qtyPrecision);
}

export function buildLadder(
	market: QuoteMarket,
	anchorScaled: bigint,
	available: AvailableBalances,
): Quote[] {
	if (anchorScaled <= 0n) return [];

	const skew = inventorySkewBps(anchorScaled, available, market);
	const halfSpread = Math.trunc(market.spreadBps / 2);
	// Keep the near-touch ask away from the anchor even at maximum skew.
	const effectiveSkew = Math.min(skew, Math.max(0, halfSpread - 1));
	const quotes: Quote[] = [];

	for (let level = 0; level < market.levelsPerSide; level++) {
		const distance = Math.max(1, halfSpread + level * market.levelStepBps);
		const bidBps = Math.max(1, distance + effectiveSkew);
		const askBps = Math.max(1, distance - effectiveSkew);

		for (const side of ["BUY", "SELL"] as const) {
			const priceScaled = applyBps(anchorScaled, side === "BUY" ? -bidBps : askBps);
			const qtyScaled = quoteQty(side, priceScaled, available, market);
			if (qtyScaled > 0n) quotes.push({ level, side, priceScaled, qtyScaled });
		}
	}

	return quotes;
}

function sortByPrice(side: OrderSide, orders: MakerOrder[], quotes: Quote[]) {
	const price = (order: MakerOrder) => order.price ?? 0n;
	return {
		orders: [...orders].sort((a, b) =>
			side === "BUY" ? Number(price(b) - price(a)) : Number(price(a) - price(b)),
		),
		quotes: quotes.sort((a, b) =>
			side === "BUY"
				? Number(b.priceScaled - a.priceScaled)
				: Number(a.priceScaled - b.priceScaled),
		),
	};
}

function shouldReplace(
	market: QuoteMarket,
	order: MakerOrder,
	quote: Quote,
	now: number,
): boolean {
	if (order.price === null) return true;
	if (now - order.createdAt >= market.staleOrderMs) return true;

	const drift = divRound(
		(order.price > quote.priceScaled ? order.price - quote.priceScaled : quote.priceScaled - order.price) *
			10_000n,
		quote.priceScaled,
	);
	if (drift > BigInt(market.driftBps)) return true;

	const remaining = order.qty - order.filledQty;
	if (remaining <= 0n) return true;
	// Requote when remaining size is more than ~25% away from the target.
	if (remaining * 4n < quote.qtyScaled * 3n || remaining * 4n > quote.qtyScaled * 5n) return true;

	return false;
}

export function planRequotes(
	market: QuoteMarket,
	ladder: Quote[],
	openOrders: MakerOrder[],
	now: number,
): RequotePlan {
	const plan: RequotePlan = { cancel: [], create: [] };
	const active = openOrders.filter(
		(order) => order.status === "OPEN" || order.status === "PARTIALLY_FILLED",
	);

	for (const side of ["BUY", "SELL"] as const) {
		const sideOrders = active.filter((order) => order.side === side);
		const sideQuotes = ladder.filter((quote) => quote.side === side);
		const { orders, quotes } = sortByPrice(side, sideOrders, sideQuotes);
		const count = Math.max(orders.length, quotes.length);

		for (let index = 0; index < count; index++) {
			const order = orders[index];
			const quote = quotes[index];

			if (!quote) {
				if (order) plan.cancel.push(order);
				continue;
			}

			if (!order) {
				plan.create.push(quote);
				continue;
			}

			if (shouldReplace(market, order, quote, now)) {
				plan.cancel.push(order);
				plan.create.push(quote);
			}
		}
	}

	return plan;
}
