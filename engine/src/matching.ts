import { addOrderToBook, recomputeBestPrice } from "./orderbook";
import { publishDepth, publishFill } from "./redis/publish";
import { streamEvent } from "./redis/stream";
import { FILLS, ORDERBOOK } from "./store";
import type { Fill, OrderRecord } from "./types/domain";

export async function matchOrder(order: OrderRecord) {
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

				order.averagePrice =
					((order.averagePrice ? order.averagePrice : 0n) * (order.filledQty - availableQty) +
						bestPrice * availableQty) /
					order.filledQty;

				restingOrder.averagePrice =
					((restingOrder.averagePrice ? restingOrder.averagePrice : 0n) *
						(restingOrder.filledQty - availableQty) +
						bestPrice * availableQty) /
					restingOrder.filledQty;

				const fill: Fill = {
					fillId: crypto.randomUUID(),
					symbol,
					price: bestPrice,
					qty: availableQty,
					buyOrderId,
					sellOrderId,
					buyerId: side === "BUY" ? order.userId : restingOrder.userId,
					sellerId: side === "BUY" ? restingOrder.userId : order.userId,
					isBuyerMaker: side !== "BUY",
					createdAt: Date.now(),
				};

				FILLS.push(fill);
				order.fills.push(fill);
				restingOrder.fills.push(fill);

				priceLevel.totalQty -= availableQty;
				priceLevel.orders.shift();

				streamEvent({
					event: "order",
					order: {
						...restingOrder,
						lockedAmount: null,
					},
				});

				await publishFill(fill);
			} else {
				priceLevel.totalQty -= remainingQty;

				restingOrder.filledQty += remainingQty;
				order.filledQty += remainingQty;

				order.status = "FILLED";
				restingOrder.status =
					restingOrder.qty === restingOrder.filledQty ? "FILLED" : "PARTIALLY_FILLED";

				order.averagePrice =
					((order.averagePrice ? order.averagePrice : 0n) * (order.filledQty - remainingQty) +
						bestPrice * remainingQty) /
					order.filledQty;

				restingOrder.averagePrice =
					((restingOrder.averagePrice ? restingOrder.averagePrice : 0n) *
						(restingOrder.filledQty - remainingQty) +
						bestPrice * remainingQty) /
					restingOrder.filledQty;

				const fill: Fill = {
					fillId: crypto.randomUUID(),
					symbol,
					price: bestPrice,
					qty: remainingQty,
					buyOrderId,
					sellOrderId,
					buyerId: side === "BUY" ? order.userId : restingOrder.userId,
					sellerId: side === "BUY" ? restingOrder.userId : order.userId,
					isBuyerMaker: order.side !== "BUY",
					createdAt: Date.now(),
				};

				FILLS.push(fill);
				order.fills.push(fill);
				restingOrder.fills.push(fill);

				remainingQty = 0n;

				streamEvent({
					event: "order",
					order: {
						...restingOrder,
						lockedAmount: null,
					},
				});

				streamEvent({
					event: "order",
					order,
				});

				await publishFill(fill);
			}

			await publishDepth({
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
		await addOrderToBook(order);
	}
}
