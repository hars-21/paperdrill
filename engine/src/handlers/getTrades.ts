import { getMarket } from "../modules/market";
import { tradesPayloadSchema } from "../schema";
import { RECENT_TRADES } from "../store";

export async function getTradesHandler(payload: Record<string, unknown>) {
	const parsed = tradesPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid trades payload");
	}

	const { symbol, limit } = parsed.data;
	getMarket(symbol);
	const trades = RECENT_TRADES[symbol] ?? [];

	return trades.reverse().slice(0, limit ?? trades.length);
}
