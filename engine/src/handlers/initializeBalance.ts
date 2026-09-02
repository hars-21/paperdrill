import { initializeUserBalance } from "../modules/balance";
import { initializeBalancePayloadSchema } from "../schema";

export async function initializeBalanceHandler(payload: Record<string, unknown>) {
	const parsed = initializeBalancePayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid payload");
	}

	const { userId, asset, amount } = parsed.data;

	return initializeUserBalance(userId, asset, amount);
}
