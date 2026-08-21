import { userPayloadSchema } from "../schema";
import { ORDERS } from "../store";

export async function getOpenOrdersHandler(payload: Record<string, unknown>) {
	const parsed = userPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid userId");
	}

	const { userId } = parsed.data;

	return [...ORDERS.values()].filter((order) => order.userId === userId && order.status === "OPEN");
}
