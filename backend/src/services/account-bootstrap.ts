import { prisma } from "../db";
import { assetPrecision } from "../store/market";
import { toBigInt } from "../utils/convert";
import { logger } from "../utils/logger";
import { sendToEngine } from "../utils/engineClient";
import { ensureLeaderboardParticipant } from "./leaderboard";

const INITIAL_BALANCE_ASSET = "USD";
const INITIAL_BALANCE_AMOUNT = "10000";

export function initialBalance(): bigint {
	const precision = assetPrecision.get(INITIAL_BALANCE_ASSET);

	if (precision == null) {
		throw new Error(`Missing precision for ${INITIAL_BALANCE_ASSET}`);
	}

	return toBigInt(INITIAL_BALANCE_AMOUNT, precision);
}

export async function initializeBalance(userId: string, amount: bigint) {
	const response = await sendToEngine("initialize_balance", {
		userId,
		asset: INITIAL_BALANCE_ASSET,
		amount: amount.toString(),
	});

	if (!response.success) {
		throw new Error(response.error ?? "Balance initialization failed");
	}
}

/** Give a newly created OAuth user the same trading baseline as a password signup. */
export async function bootstrapOAuthUser(userId: string) {
	const balance = initialBalance();
	const pnlBaselineAt = new Date();

	try {
		await prisma.user.update({
			where: { id: userId },
			data: { pnlBaseline: balance, pnlBaselineAt },
		});
		await initializeBalance(userId, balance);
		await ensureLeaderboardParticipant(userId);
	} catch (error) {
		logger.error("OAuth account bootstrap failed", error);
		await prisma.user.delete({ where: { id: userId } }).catch((deleteError) => {
			logger.error("Failed to roll back OAuth user", deleteError);
		});
		throw error;
	}
}

/** A verified Google email should satisfy PaperDrill's email verification check. */
export async function verifyGoogleLinkedUser(userId: string) {
	await prisma.user.update({
		where: { id: userId },
		data: { emailVerified: true },
	});
	await ensureLeaderboardParticipant(userId);
}
