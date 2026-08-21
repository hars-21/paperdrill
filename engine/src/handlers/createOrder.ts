import { lockBalance, releaseBalance, settleFills } from "../modules/balance";
import { matchOrder } from "../modules/matching";
import { ORDERS, ARCHIVED_ORDERS } from "../store";
import { emitEvent } from "../core/eventBus";
import { orderPayloadSchema } from "../schema";
import type { Fill, InternalOrder, OrderRecord } from "../types/domain";

function computeAveragePrice(fills: Fill[]): bigint | null {
	if (fills.length === 0) return null;
	let totalValue = 0n;
	let totalQty = 0n;
	for (const fill of fills) {
		totalValue += fill.price * fill.qty;
		totalQty += fill.qty;
	}
	return totalValue / totalQty;
}

function toWireOrder(
	order: InternalOrder,
	fills: Fill[],
	averagePrice: bigint | null,
): OrderRecord {
	return { ...order, fills, averagePrice };
}

export async function createOrderHandler(payload: Record<string, unknown>) {
	const parsed = orderPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid order");
	}

	const input = parsed.data;

	const lockedResult = lockBalance(input);

	const order: InternalOrder = {
		...input,
		filledQty: 0n,
		status: "OPEN",
		lockedAmount: lockedResult.locked,
		createdAt: Date.now(),
	};

	ORDERS.set(order.orderId, order);

	emitEvent({ type: "order.created", order: toWireOrder(order, [], null) });

	const matchResult = await matchOrder(order);

	for (const affected of matchResult.affectedOrders) {
		const affectedFills = matchResult.fills.filter(
			(f) => f.buyOrderId === affected.orderId || f.sellOrderId === affected.orderId,
		);

		emitEvent({
			type: "order.filled",
			order: toWireOrder(
				{ ...affected, lockedAmount: null },
				affectedFills,
				computeAveragePrice(affectedFills),
			),
		});

		ORDERS.delete(affected.orderId);
		ARCHIVED_ORDERS.set(affected.orderId, "FILLED");
	}

	if (matchResult.fills.length > 0) {
		settleFills(matchResult.fills);

		for (const fill of matchResult.fills) {
			emitEvent({ type: "fill.created", fill });
		}
	}

	const averagePrice = computeAveragePrice(matchResult.fills);

	if (order.type === "MARKET" && matchResult.finalStatus === "PARTIALLY_FILLED") {
		order.status = "CANCELLED";
		emitEvent({ type: "order.cancelled", order: toWireOrder(order, [], null) });
		ORDERS.delete(order.orderId);
		ARCHIVED_ORDERS.set(order.orderId, "CANCELLED");
	} else if (matchResult.finalStatus === "FILLED") {
		emitEvent({ type: "order.filled", order: toWireOrder(order, matchResult.fills, averagePrice) });
		ORDERS.delete(order.orderId);
		ARCHIVED_ORDERS.set(order.orderId, "FILLED");
	} else if (matchResult.finalStatus === "PARTIALLY_FILLED") {
		emitEvent({ type: "order.partially_filled", order: toWireOrder(order, [], null) });
	}

	for (const depth of matchResult.depthChanges) {
		emitEvent({ type: "depth.changed", ...depth });
	}

	if (order.status === "FILLED" || order.status === "CANCELLED") {
		releaseBalance(order, matchResult.fills);
	}

	return {
		orderId: order.orderId,
		symbol: order.symbol,
		status: order.status,
		filledQty: order.filledQty,
		averagePrice,
		lockedAmount: order.lockedAmount,
		fills: matchResult.fills,
	};
}
