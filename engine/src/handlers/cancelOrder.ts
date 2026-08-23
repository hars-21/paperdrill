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

	const { userId, id } = parsed.data;

	const order = ORDERS.get(id);

	if (!order || order.userId !== userId) {
		const archivedStatus = ARCHIVED_ORDERS.get(id);

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

	ORDERS.delete(id);
	ARCHIVED_ORDERS.set(id, "CANCELLED");

	emitEvent({
		type: "order.cancelled",
		order: { ...order, fills: [], averagePrice: null },
	});

	if (depthChange) {
		emitEvent({ type: "depth.changed", ...depthChange });
	}

	return {
		id: order.id,
		symbol: order.symbol,
		status: order.status,
		qty: order.qty,
		filledQty: order.filledQty,
	};
}
