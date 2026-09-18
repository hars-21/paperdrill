import { applyCredit } from "../modules/balance";
import { creditPayloadSchema } from "../schema";

export async function applyCreditHandler(payload: Record<string, unknown>) {
	const parsed = creditPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid payload");
	}

	const { creditId, userId, asset, amount } = parsed.data;
	return applyCredit(creditId, userId, asset, amount);
}
