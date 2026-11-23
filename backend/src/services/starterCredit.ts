import { Prisma } from "../../generated/prisma/client";
import { CreditClaimKind } from "../../generated/prisma/enums";
import { prisma } from "../db";
import { ApiError } from "../utils/apiError";
import {
	STARTER_BALANCE_AMOUNT,
	STARTER_BALANCE_ASSET,
	initializeBalance,
	starterBalanceAmount,
} from "./account-bootstrap";
import { ensureLeaderboardParticipant } from "./leaderboard";

export async function hasStarterClaim(userId: string) {
	const claim = await prisma.creditClaim.findUnique({
		where: {
			userId_kind_periodKey: { userId, kind: CreditClaimKind.STARTER, periodKey: "" },
		},
		select: { id: true },
	});
	return claim !== null;
}

export async function claimInitialCredit(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true, pnlBaseline: true },
	});

	if (!user) {
		throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
	}
	if (!user.username) {
		throw new ApiError(
			409,
			"ONBOARDING_INCOMPLETE",
			"Choose a username before claiming your starter balance",
		);
	}

	if (await hasStarterClaim(userId)) {
		return {
			claimed: false,
			asset: STARTER_BALANCE_ASSET,
			amount: STARTER_BALANCE_AMOUNT,
		};
	}

	const amount = starterBalanceAmount();
	await initializeBalance(userId, amount);

	try {
		await prisma.$transaction(async (transaction) => {
			await transaction.creditClaim.create({
				data: {
					userId,
					kind: CreditClaimKind.STARTER,
					periodKey: "",
					asset: STARTER_BALANCE_ASSET,
					amount,
				},
			});

			if (user.pnlBaseline == null) {
				await transaction.user.update({
					where: { id: userId },
					data: { pnlBaseline: amount, pnlBaselineAt: new Date() },
				});
			}
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return {
				claimed: false,
				asset: STARTER_BALANCE_ASSET,
				amount: STARTER_BALANCE_AMOUNT,
			};
		}
		throw error;
	}

	void ensureLeaderboardParticipant(userId);

	return {
		claimed: true,
		asset: STARTER_BALANCE_ASSET,
		amount: STARTER_BALANCE_AMOUNT,
	};
}
