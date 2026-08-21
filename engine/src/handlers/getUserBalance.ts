import { getUserBalance } from "../modules/balance";
import { userPayloadSchema } from "../schema";

export async function getUserBalanceHandler(payload: Record<string, unknown>) {
	const parsed = userPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? "Invalid userId");
	}

	return getUserBalance(parsed.data.userId);
}
