import { getUserBalance } from "../modules/balance";
import { balancePayloadSchema } from "../schema";

export async function getUserBalanceHandler(payload: Record<string, unknown>) {
	const parsed = balancePayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid payload");
	}

	const { userId, asset } = parsed.data;

	return getUserBalance(userId, asset);
}
