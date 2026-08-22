import { tradesPayloadSchema } from "../schema";
import { RECENT_TRADES } from "../store";

export async function getTradesHandler(payload: Record<string, unknown>) {
	const parsed = tradesPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid trades payload");
	}

	const { symbol, limit } = parsed.data;
	const trades = RECENT_TRADES[symbol] ?? [];

	return {
		symbol,
		trades: [...trades].reverse().slice(0, limit ?? trades.length),
	};
}
