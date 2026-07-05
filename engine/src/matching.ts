import { addOrderToBook, publishDepth, publishFill, recomputeBestPrice } from "./orderbook";
import { FILLS, ORDERBOOK } from "./store";
import type { Fill, OrderRecord } from "./types/domain";

export function matchOrder(order: OrderRecord) {
	let remainingQty = order.qty - order.filledQty;

	while (remainingQty > 0) {
		const bestPrice =
			order.side === "BUY" ? ORDERBOOK[order.symbol]?.bestAsk : ORDERBOOK[order.symbol]?.bestBid;
		if (bestPrice === null || bestPrice === undefined) break;

		if (order.type === "LIMIT") {
			if (order.price === null) {
				throw new Error("LIMIT order must have price");
			}

			if (
				(order.side === "BUY" && bestPrice > order.price) ||
				(order.side === "SELL" && bestPrice < order.price)
			) {
				break;
			}
		}

		const matchSide = order.side === "BUY" ? "asks" : "bids";

		const priceLevel = ORDERBOOK[order.symbol]![matchSide][bestPrice];
		if (!priceLevel) break;

		while (remainingQty > 0 && priceLevel.orders.length > 0) {
			const restingOrder = priceLevel.orders[0]!;
			const availableQty = restingOrder.qty - restingOrder.filledQty;

			const buyOrderId = order.side === "BUY" ? order.orderId : restingOrder.orderId;
			const sellOrderId = order.side === "BUY" ? restingOrder.orderId : order.orderId;

			if (remainingQty >= availableQty) {
				remainingQty -= availableQty;
				restingOrder.filledQty += availableQty;

				order.filledQty += availableQty;
				order.status = remainingQty === 0 ? "FILLED" : "PARTIALLY_FILLED";
				restingOrder.status =
					restingOrder.qty === restingOrder.filledQty ? "FILLED" : "PARTIALLY_FILLED";

				const fill: Fill = {
					fillId: crypto.randomUUID(),
					symbol: order.symbol,
					price: bestPrice,
					qty: availableQty,
					buyOrderId,
					sellOrderId,
					isBuyerMaker: order.side !== "BUY",
					createdAt: Date.now(),
				};

				FILLS.push(fill);
				order.fills.push(fill);
				restingOrder.fills.push(fill);

				priceLevel.totalQty -= availableQty;
				priceLevel.orders.shift();

				publishFill({
					symbol: fill.symbol,
					price: fill.price,
					qty: fill.qty,
					maker: fill.isBuyerMaker,
					timestamp: fill.createdAt,
				});
			} else {
				restingOrder.filledQty += remainingQty;
				priceLevel.totalQty -= remainingQty;

				order.filledQty += remainingQty;
				order.status = "FILLED";
				restingOrder.status =
					restingOrder.qty === restingOrder.filledQty ? "FILLED" : "PARTIALLY_FILLED";

				const fill: Fill = {
					fillId: crypto.randomUUID(),
					symbol: order.symbol,
					price: bestPrice,
					qty: remainingQty,
					buyOrderId,
					sellOrderId,
					isBuyerMaker: order.side !== "BUY",
					createdAt: Date.now(),
				};

				FILLS.push(fill);
				order.fills.push(fill);
				restingOrder.fills.push(fill);

				remainingQty = 0;

				publishFill({
					symbol: fill.symbol,
					price: fill.price,
					qty: fill.qty,
					maker: fill.isBuyerMaker,
					timestamp: fill.createdAt,
				});
			}

			publishDepth({
				symbol: order.symbol,
				price: bestPrice,
				qty: priceLevel.totalQty,
				side: matchSide,
			});
		}

		if (priceLevel.orders.length === 0) {
			delete ORDERBOOK[order.symbol]![matchSide][bestPrice];
			recomputeBestPrice(order.symbol, matchSide);
		}
	}

	if (remainingQty > 0 && order.type === "LIMIT") {
		addOrderToBook(order);
	}
}
