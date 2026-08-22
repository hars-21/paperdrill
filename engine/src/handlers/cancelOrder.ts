import { releaseBalance } from "../modules/balance";
import { removeOrderFromBook } from "../modules/orderbook";
import { ORDERS, ARCHIVED_ORDERS } from "../store";
import { emitEvent } from "../core/eventBus";
import { orderIdPayloadSchema } from "../schema";

export async function cancelOrderHandler(payload: Record<string, unknown>) {
	const parsed = orderIdPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid cancel payload");
	}

	const { userId, orderId } = parsed.data;

	const order = ORDERS.get(orderId);

	if (!order || order.userId !== userId) {
		const archivedStatus = ARCHIVED_ORDERS.get(orderId);

		if (archivedStatus === "FILLED") {
			throw new Error("Filled orders cannot be cancelled");
		}

		if (archivedStatus === "CANCELLED") {
			return { message: "Order already cancelled" };
		}

		throw new Error("Order not found");
	}

	const depthChange = removeOrderFromBook(order);

	order.status = "CANCELLED";

	releaseBalance(order);

	ORDERS.delete(orderId);
	ARCHIVED_ORDERS.set(orderId, "CANCELLED");

	emitEvent({
		type: "order.cancelled",
		order: { ...order, fills: [], averagePrice: null },
	});

	if (depthChange) {
		emitEvent({ type: "depth.changed", ...depthChange });
	}

	return {
		orderId: order.orderId,
		symbol: order.symbol,
		status: order.status,
		qty: order.qty,
		filledQty: order.filledQty,
	};
}
