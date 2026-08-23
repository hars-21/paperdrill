import { recomputeBestPrice, addOrderToBook, type DepthChange } from "./orderbook";
import { recordFill } from "../store";
import type { Fill, InternalOrder, RestingOrder } from "../types/domain";
import { getMarket } from "./market";

export interface MatchResult {
	fills: Fill[];
	finalStatus: InternalOrder["status"];
	finalFilledQty: bigint;
	affectedOrders: RestingOrder[];
	depthChanges: DepthChange[];
}

export async function matchOrder(order: InternalOrder): Promise<MatchResult> {
	const { id, side, type, symbol, price, qty, filledQty } = order;

	let remainingQty = qty - filledQty;
	const market = getMarket(symbol);
	const affectedOrders: RestingOrder[] = [];
	const fills: Fill[] = [];
	const depthChanges: DepthChange[] = [];

	while (remainingQty > 0) {
		const bestPrice = side === "BUY" ? market.bestAsk : market.bestBid;
		if (bestPrice === null || bestPrice === undefined) break;

		if (type === "LIMIT") {
			if (price === null) throw new Error("LIMIT order must have price");
			if ((side === "BUY" && bestPrice > price) || (side === "SELL" && bestPrice < price)) break;
		}

		const matchSide = side === "BUY" ? "asks" : "bids";
		const priceLevel = market[matchSide].get(bestPrice);
		if (!priceLevel) break;

		while (remainingQty > 0 && priceLevel.orders.length > 0) {
			const restingOrder = priceLevel.orders[0]!;
			const availableQty = restingOrder.qty - restingOrder.filledQty;
			const buyOrderId = side === "BUY" ? id : restingOrder.id;
			const sellOrderId = side === "BUY" ? restingOrder.id : id;
			const matchQty = remainingQty >= availableQty ? availableQty : remainingQty;

			restingOrder.filledQty += matchQty;
			order.filledQty += matchQty;
			remainingQty -= matchQty;

			order.status = remainingQty === 0n ? "FILLED" : "PARTIALLY_FILLED";
			restingOrder.status =
				restingOrder.qty === restingOrder.filledQty ? "FILLED" : "PARTIALLY_FILLED";

			const fill: Fill = {
				id: crypto.randomUUID(),
				symbol,
				price: bestPrice,
				qty: matchQty,
				buyOrderId,
				sellOrderId,
				buyerId: side === "BUY" ? order.userId : restingOrder.userId,
				sellerId: side === "BUY" ? restingOrder.userId : order.userId,
				isBuyerMaker: side !== "BUY",
				createdAt: Date.now(),
			};

			const cost = (bestPrice * matchQty) / 10n ** BigInt(market.qtyPrecision);
			if (side === "BUY") order.spentAmount += cost;
			else restingOrder.spentAmount += cost;

			recordFill(fill);
			fills.push(fill);

			priceLevel.totalQty -= matchQty;

			if (matchQty >= availableQty) {
				priceLevel.orders.shift();
			}

			if (!affectedOrders.find((o) => o.id === restingOrder.id)) {
				affectedOrders.push(restingOrder);
			}
		}

		depthChanges.push({ symbol, side: matchSide, price: bestPrice, qty: priceLevel.totalQty });

		if (priceLevel.orders.length === 0) {
			market[matchSide].delete(bestPrice);
			recomputeBestPrice(symbol, matchSide);
		}
	}

	if (remainingQty > 0 && type === "LIMIT") {
		const depth = addOrderToBook(order);
		if (depth) depthChanges.push(depth);
	}

	return {
		fills,
		finalStatus: order.status,
		finalFilledQty: order.filledQty,
		affectedOrders,
		depthChanges,
	};
}
