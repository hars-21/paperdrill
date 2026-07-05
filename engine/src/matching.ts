import { addOrderToBook, publishDepth, publishFill, recomputeBestPrice } from "./orderbook";
import { FILLS, ORDERBOOK } from "./store";
import type { Fill, OrderRecord } from "./types/domain";

export function matchOrder(order: OrderRecord) {
	const { orderId, side, type, symbol, price, qty, filledQty } = order;

	let remainingQty = qty - filledQty;
	const market = ORDERBOOK[symbol]!;

	while (remainingQty > 0) {
		const bestPrice = side === "BUY" ? market.bestAsk : market.bestBid;
		if (bestPrice === null || bestPrice === undefined) break;

		if (type === "LIMIT") {
			if (price === null) {
				throw new Error("LIMIT order must have price");
			}

			if ((side === "BUY" && bestPrice > price) || (side === "SELL" && bestPrice < price)) {
				break;
			}
		}

		const matchSide = side === "BUY" ? "asks" : "bids";

		const priceLevel = market[matchSide].get(bestPrice);
		if (!priceLevel) break;

		while (remainingQty > 0 && priceLevel.orders.length > 0) {
			const restingOrder = priceLevel.orders[0]!;
			const availableQty = restingOrder.qty - restingOrder.filledQty;

			const buyOrderId = side === "BUY" ? orderId : restingOrder.orderId;
			const sellOrderId = side === "BUY" ? restingOrder.orderId : orderId;

			if (remainingQty >= availableQty) {
				remainingQty -= availableQty;
				restingOrder.filledQty += availableQty;

				order.filledQty += availableQty;
				order.status = remainingQty === 0n ? "FILLED" : "PARTIALLY_FILLED";
				restingOrder.status =
					restingOrder.qty === restingOrder.filledQty ? "FILLED" : "PARTIALLY_FILLED";

				const fill: Fill = {
					fillId: crypto.randomUUID(),
					symbol,
					price: bestPrice,
					qty: availableQty,
					buyOrderId,
					sellOrderId,
					isBuyerMaker: side !== "BUY",
					createdAt: Date.now(),
				};

				FILLS.push(fill);
				order.fills.push(fill);
				restingOrder.fills.push(fill);

				priceLevel.totalQty -= availableQty;
				priceLevel.orders.shift();

				publishFill({
					symbol,
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
					symbol,
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

				remainingQty = 0n;

				publishFill({
					symbol,
					price: fill.price,
					qty: fill.qty,
					maker: fill.isBuyerMaker,
					timestamp: fill.createdAt,
				});
			}

			publishDepth({
				symbol,
				price: bestPrice,
				qty: priceLevel.totalQty,
				side: matchSide,
			});
		}

		if (priceLevel.orders.length === 0) {
			market[matchSide].delete(bestPrice);
			recomputeBestPrice(symbol, matchSide);
		}
	}

	if (remainingQty > 0 && type === "LIMIT") {
		addOrderToBook(order);
	}
}
