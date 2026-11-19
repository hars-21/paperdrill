import { prisma } from "../db";
import { assetPrecision } from "../store/market";
import { toBigInt } from "../utils/convert";
import { sendToEngine } from "../utils/engineClient";

export const STARTER_BALANCE_ASSET = "USD";
export const STARTER_BALANCE_AMOUNT = "10000";

export function starterBalanceAmount(): bigint {
	const precision = assetPrecision.get(STARTER_BALANCE_ASSET);
	if (precision == null) {
		throw new Error(`Missing precision for ${STARTER_BALANCE_ASSET}`);
	}

	return toBigInt(STARTER_BALANCE_AMOUNT, precision);
}

export async function initializeBalance(userId: string, amount: bigint) {
	const response = await sendToEngine("initialize_balance", {
		userId,
		asset: STARTER_BALANCE_ASSET,
		amount: amount.toString(),
	});

	if (!response.success) {
		throw new Error(response.error ?? "Balance initialization failed");
	}
}

/** A verified Google email should satisfy PaperDrill's email verification check. */
export async function ensureGoogleUserVerified(userId: string) {
	await prisma.user.updateMany({
		where: { id: userId, emailVerified: false },
		data: { emailVerified: true },
	});
}
