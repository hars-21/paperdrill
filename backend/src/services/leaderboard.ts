import { prisma } from "../db";
import { marketStore } from "../store/market";
import { sendToEngine } from "../utils/engineClient";
import { logger } from "../utils/logger";
import { rankLeaderboard, type LeaderboardCandidate } from "../utils/leaderboard";
import { calculatePortfolio, type Balance } from "../utils/portfolio";
import { getReferencePrices } from "../utils/referencePrice";

export const LEADERBOARD_REFRESH_MS = 60_000;

type EngineBalance = { available: string; locked: string };
type EngineBalances = Record<string, Record<string, EngineBalance>>;

let refreshing = false;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function parseBalances(balances: Record<string, EngineBalance>): Record<string, Balance> {
	return Object.fromEntries(
		Object.entries(balances).map(([asset, balance]) => [
			asset,
			{ available: BigInt(balance.available), locked: BigInt(balance.locked) },
		]),
	);
}

export async function refreshLeaderboard() {
	if (refreshing) return;
	refreshing = true;
	const startedAt = Date.now();

	try {
		const engineResponse = await sendToEngine("get_all_balances", {});
		if (!engineResponse.success) throw new Error(engineResponse.error ?? "Balance snapshot failed");

		const allBalances = engineResponse.data as EngineBalances;
		const markets = [...marketStore.values()];
		const quoteAssets = new Set(markets.map((market) => market.quoteAsset));
		if (quoteAssets.size !== 1) throw new Error("Leaderboard requires one quote asset");

		const quoteAsset = quoteAssets.values().next().value as string;
		const prices = await getReferencePrices(markets);
		const users = await prisma.user.findMany({
			where: {
				type: "USER",
				emailVerified: true,
				pnlBaseline: { not: null },
				pnlBaselineAt: { not: null },
				OR: [{ buyFills: { some: {} } }, { sellFills: { some: {} } }],
			},
			select: { id: true, createdAt: true, pnlBaseline: true },
		});

		const candidates: LeaderboardCandidate[] = [];
		let missingBalances = 0;
		let valuationFailures = 0;

		for (const user of users) {
			const rawBalances = allBalances[user.id];
			if (!rawBalances) {
				missingBalances += 1;
				continue;
			}

			try {
				const portfolio = calculatePortfolio(parseBalances(rawBalances), markets, prices);
				if (portfolio.partial) continue;
				if (user.pnlBaseline == null) continue;

				candidates.push({
					userId: user.id,
					createdAt: user.createdAt,
					baseline: user.pnlBaseline,
					equity: portfolio.equity,
				});
			} catch {
				valuationFailures += 1;
			}
		}

		if (users.length > 0 && candidates.length === 0) {
			throw new Error("Unable to value any eligible leaderboard users");
		}

		const asOf = new Date();
		const entries = rankLeaderboard(candidates);

		const entryCount = await prisma.$transaction(async (transaction) => {
			await transaction.leaderboardEntry.deleteMany();
			if (entries.length > 0) {
				await transaction.leaderboardEntry.createMany({
					data: entries.map((entry) => ({
						userId: entry.userId,
						position: entry.position,
						rank: entry.rank,
						baseline: entry.baseline,
						equity: entry.equity,
						pnl: entry.pnl,
					})),
				});
			}
			await transaction.leaderboardState.upsert({
				where: { id: 1 },
				create: { id: 1, quoteAsset, asOf },
				update: { quoteAsset, asOf },
			});

			return entries.length;
		});

		logger.info("Leaderboard refreshed", {
			entries: entryCount,
			missingBalances,
			valuationFailures,
			durationMs: Date.now() - startedAt,
			asOf: asOf.toISOString(),
		});
	} catch (error) {
		logger.error("Leaderboard refresh failed", {
			error: error instanceof Error ? error.message : "Unknown error",
			durationMs: Date.now() - startedAt,
		});
	} finally {
		refreshing = false;
	}
}

export function startLeaderboardRefresh() {
	if (refreshTimer) return;
	void refreshLeaderboard();
	refreshTimer = setInterval(() => void refreshLeaderboard(), LEADERBOARD_REFRESH_MS);
	refreshTimer.unref();
}

export function stopLeaderboardRefresh() {
	if (!refreshTimer) return;
	clearInterval(refreshTimer);
	refreshTimer = null;
}
