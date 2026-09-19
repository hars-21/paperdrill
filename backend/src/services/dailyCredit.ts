import { Prisma } from "../../generated/prisma/client";
import { DailyCreditStatus, UserType } from "../../generated/prisma/enums";
import { prisma } from "../db";
import { assetPrecision } from "../store/market";
import { ApiError } from "../utils/apiError";
import { fromBigInt, toBigInt } from "../utils/convert";
import { sendToEngine } from "../utils/engineClient";

export const DAILY_CREDIT_ASSET = "USD";
export const DAILY_CREDIT_AMOUNT = "100";

export function utcCreditDate(now = new Date()) {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nextUtcCreditDate(creditDate: Date) {
	return new Date(creditDate.getTime() + 24 * 60 * 60 * 1000);
}

async function findOrCreateCredit(userId: string, creditDate: Date, amount: bigint) {
	try {
		return await prisma.dailyCredit.create({
			data: { userId, creditDate, asset: DAILY_CREDIT_ASSET, amount },
		});
	} catch (error) {
		if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
			throw error;
		}

		return prisma.dailyCredit.findUniqueOrThrow({
			where: { userId_creditDate: { userId, creditDate } },
		});
	}
}

export async function claimDailyCredit(userId: string, now = new Date()) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { type: true, emailVerified: true, pnlBaseline: true },
	});

	if (!user) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
	if (user.type !== UserType.USER) {
		throw new ApiError(403, "DAILY_CREDIT_NOT_ELIGIBLE", "Service accounts are not eligible");
	}
	if (!user.emailVerified) {
		throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Verify your email to claim daily credit");
	}
	if (user.pnlBaseline == null) {
		throw new ApiError(503, "DAILY_CREDIT_UNAVAILABLE", "PnL baseline is not configured");
	}

	const precision = assetPrecision.get(DAILY_CREDIT_ASSET);
	if (precision == null) {
		throw new ApiError(503, "DAILY_CREDIT_UNAVAILABLE", "Daily credit is temporarily unavailable");
	}

	const creditDate = utcCreditDate(now);
	const configuredAmount = toBigInt(DAILY_CREDIT_AMOUNT, precision);
	const credit = await findOrCreateCredit(userId, creditDate, configuredAmount);

	if (credit.status === DailyCreditStatus.APPLIED) {
		return {
			credited: false,
			asset: credit.asset,
			amount: fromBigInt(credit.amount, precision),
			creditDate: creditDate.toISOString().slice(0, 10),
			nextEligibleAt: nextUtcCreditDate(creditDate).toISOString(),
		};
	}

	const engineResponse = await sendToEngine("apply_credit", {
		creditId: credit.id,
		userId,
		asset: credit.asset,
		amount: credit.amount.toString(),
	});

	if (!engineResponse.success) {
		throw new ApiError(503, "DAILY_CREDIT_UNAVAILABLE", "Daily credit is temporarily unavailable");
	}

	const credited = await prisma.$transaction(async (transaction) => {
		const applied = await transaction.dailyCredit.updateMany({
			where: { id: credit.id, status: DailyCreditStatus.PENDING },
			data: { status: DailyCreditStatus.APPLIED, appliedAt: new Date() },
		});

		if (applied.count === 0) return false;

		await transaction.user.update({
			where: { id: userId },
			data: { pnlBaseline: { increment: credit.amount } },
		});

		return true;
	});

	return {
		credited,
		asset: credit.asset,
		amount: fromBigInt(credit.amount, precision),
		creditDate: creditDate.toISOString().slice(0, 10),
		nextEligibleAt: nextUtcCreditDate(creditDate).toISOString(),
	};
}
