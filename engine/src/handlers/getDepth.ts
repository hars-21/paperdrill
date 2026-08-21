import { symbolPayloadSchema } from "../schema";
import { getDepth } from "../modules/orderbook";

export async function getDepthHandler(payload: Record<string, unknown>) {
	const parsed = symbolPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid symbol");
	}

	return getDepth(parsed.data.symbol);
}
