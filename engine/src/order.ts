import { lockBalance, releaseBalance, settleFills } from "./balance";
import { removeOrderFromBook } from "./orderbook";
import { FILLS, ORDERS } from "./store";
import type { CreateOrderInput, OrderRecord } from "./types/domain";
import { matchOrder } from "./matching";
import { streamEvent } from "./redis/stream";

export async function placeOrder(orderInput: CreateOrderInput) {
	const lockedAmount = lockBalance(orderInput);

	const order: OrderRecord = {
		...orderInput,
		filledQty: 0n,
		status: "OPEN",
		fills: [],
		lockedAmount,
		averagePrice: null,
		createdAt: Date.now(),
	};

	ORDERS.set(order.orderId, order);

	streamEvent({ event: "order", order });

	await matchOrder(order);

	if (order.fills.length > 0) {
		settleFills(order.fills);
	}

	if (order.type === "MARKET" && order.status === "PARTIALLY_FILLED") {
		order.status = "CANCELLED";
	}

	if (orderInput.type === "MARKET" || order.status === "FILLED") {
		releaseBalance(order);
	}

	return {
		orderId: order.orderId,
		symbol: order.symbol,
		status: order.status,
		filledQty: order.filledQty,
		averagePrice: order.averagePrice,
		lockedAmount,
		fills: order.fills,
	};
}

export function getOrder(userId: string, orderId: string) {
	const order = ORDERS.get(orderId);

	if (order === undefined || order.userId !== userId) {
		throw new Error("Order not Found");
	}

	return order;
}

export function getOpenOrders(userId: string) {
	const orders = [...ORDERS.values()].filter(
		(order) => order.status === "OPEN" && order.userId === userId,
	);

	return orders;
}

export async function cancelOrder(userId: string, orderId: string) {
	const order = ORDERS.get(orderId);

	if (!order || order.userId !== userId) throw new Error("Order not Found");

	if (order.status === "FILLED") throw new Error("Filled orders cannot be cancelled");

	if (order.status === "CANCELLED") return { message: "Order already cancelled" };

	await removeOrderFromBook(order);

	const releasedFunds = releaseBalance(order);

	order.status = "CANCELLED";

	streamEvent({
		event: "order",
		order,
	});

	return {
		orderId: order.orderId,
		symbol: order.symbol,
		status: order.status,
		qty: order.qty,
		filledQty: order.filledQty,
		releasedFunds,
	};
}

export function getFills(symbol: string, limit: number = 100) {
	return FILLS.filter((f) => f.symbol === symbol)
		.reverse()
		.slice(0, limit);
}
