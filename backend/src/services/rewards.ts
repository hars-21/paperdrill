import { CreditClaimKind, DailyCreditStatus, UserType } from "../../generated/prisma/enums";
import { prisma } from "../db";
import { assetPrecision } from "../store/market";
import { ApiError } from "../utils/apiError";
import { fromBigInt } from "../utils/convert";
import {
	DAILY_CREDIT_AMOUNT,
	DAILY_CREDIT_ASSET,
	nextUtcCreditDate,
	utcCreditDate,
} from "./dailyCredit";
import { STARTER_BALANCE_AMOUNT, STARTER_BALANCE_ASSET } from "./account-bootstrap";

export interface RewardsHistoryItem {
	id: string;
	kind: "INITIAL" | "DAILY";
	asset: string;
	amount: string;
	createdAt: string;
}

export interface RewardsSummary {
	initial: {
		asset: string;
		amount: string;
		claimed: boolean;
		available: boolean;
		claimedAt: string | null;
	};
	daily: {
		asset: string;
		amount: string;
		eligible: boolean;
		claimedToday: boolean;
		pending: boolean;
		creditDate: string;
		nextEligibleAt: string;
	};
	history: RewardsHistoryItem[];
}

function displayAmount(amount: bigint, asset: string) {
	const precision = assetPrecision.get(asset);
	return precision == null ? amount.toString() : fromBigInt(amount, precision);
}

export async function getRewardsSummary(userId: string, now = new Date()): Promise<RewardsSummary> {
	const precision = assetPrecision.get(DAILY_CREDIT_ASSET);
	if (precision == null) {
		throw new ApiError(503, "REWARDS_UNAVAILABLE", "Rewards are temporarily unavailable");
	}

	const creditDate = utcCreditDate(now);
	const [user, starterClaim, todaysCredit, starterClaims, dailyClaims] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: { type: true, emailVerified: true, username: true, pnlBaseline: true },
		}),
		prisma.creditClaim.findUnique({
			where: {
				userId_kind_periodKey: {
					userId,
					kind: CreditClaimKind.STARTER,
					periodKey: "",
				},
			},
			select: { createdAt: true },
		}),
		prisma.dailyCredit.findUnique({
			where: { userId_creditDate: { userId, creditDate } },
			select: { status: true },
		}),
		prisma.creditClaim.findMany({
			where: { userId, kind: CreditClaimKind.STARTER },
			orderBy: { createdAt: "desc" },
		}),
		prisma.dailyCredit.findMany({
			where: { userId, status: DailyCreditStatus.APPLIED },
			orderBy: { appliedAt: "desc" },
		}),
	]);

	if (!user) {
		throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
	}

	const initialClaimed = starterClaim !== null;
	const dailyApplied = todaysCredit?.status === DailyCreditStatus.APPLIED;
	const canReceiveCredits = user.type === UserType.USER;

	const history: RewardsHistoryItem[] = [
		...starterClaims.map((claim) => ({
			id: claim.id,
			kind: "INITIAL" as const,
			asset: claim.asset,
			amount: displayAmount(claim.amount, claim.asset),
			createdAt: claim.createdAt.toISOString(),
		})),
		...dailyClaims.map((credit) => ({
			id: credit.id,
			kind: "DAILY" as const,
			asset: credit.asset,
			amount: displayAmount(credit.amount, credit.asset),
			createdAt: (credit.appliedAt ?? credit.createdAt).toISOString(),
		})),
	]
		.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
		.slice(0, 20);

	return {
		initial: {
			asset: STARTER_BALANCE_ASSET,
			amount: STARTER_BALANCE_AMOUNT,
			claimed: initialClaimed,
			available: canReceiveCredits && !initialClaimed && Boolean(user.username),
			claimedAt: starterClaim?.createdAt.toISOString() ?? null,
		},
		daily: {
			asset: DAILY_CREDIT_ASSET,
			amount: DAILY_CREDIT_AMOUNT,
			eligible:
				canReceiveCredits &&
				user.emailVerified &&
				user.pnlBaseline != null &&
				!dailyApplied,
			claimedToday: dailyApplied,
			pending: todaysCredit?.status === DailyCreditStatus.PENDING,
			creditDate: creditDate.toISOString().slice(0, 10),
			nextEligibleAt: dailyApplied
				? nextUtcCreditDate(creditDate).toISOString()
				: creditDate.toISOString(),
		},
		history,
	};
}
