import { addBalance } from "../modules/balance";
import { depositPayloadSchema } from "../schema";

export async function createDepositHandler(payload: Record<string, unknown>) {
	const parsed = depositPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid payload");
	}

	const { userId, asset, amount } = parsed.data;

	return addBalance(userId, asset, amount);
}
