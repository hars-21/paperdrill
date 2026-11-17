import { expect, test } from "bun:test";
import {
	MAX_LEADERBOARD_HISTORY_POINTS,
	compactLeaderboardHistory,
	leaderboardHistoryForRange,
	rankLeaderboard,
	type LeaderboardCandidate,
} from "../src/utils/leaderboard";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date("2026-03-01T00:00:00.000Z").getTime();
const createdAt = now - 40 * DAY;

function candidate(
	userId: string,
	values: {
		baseline?: bigint;
		equity: bigint;
		netContributions: bigint;
		history?: { at: number; equity: bigint; netContributions: bigint }[];
	},
): LeaderboardCandidate {
	return {
		userId,
		createdAt,
		baseline: values.baseline ?? values.netContributions,
		baselineAt: createdAt,
		equity: values.equity,
		netContributions: values.netContributions,
		history: values.history ?? [],
	};
}

test("all-time ranking uses lifetime performance over contributions", () => {
	const result = rankLeaderboard(
		[
			candidate("gain-10", { equity: 1100n, netContributions: 1000n }),
			candidate("gain-20", { equity: 6000n, netContributions: 5000n }),
			candidate("loss", { equity: 900n, netContributions: 1000n }),
		],
		"all",
		now,
	);

	expect(result.map((entry) => entry.userId)).toEqual(["gain-20", "gain-10", "loss"]);
	expect(result.map((entry) => entry.pnl)).toEqual([1000n, 100n, -100n]);
});

test("range ranking measures performance since the range start", () => {
	const earlyGain = candidate("early-gain", {
		equity: 2000n,
		netContributions: 1000n,
		history: [
			{ at: now - 30 * DAY, equity: 1000n, netContributions: 1000n },
			{ at: now - 2 * DAY, equity: 2000n, netContributions: 1000n },
			{ at: now, equity: 2000n, netContributions: 1000n },
		],
	});
	const recentGain = candidate("recent-gain", {
		equity: 1100n,
		netContributions: 1000n,
		history: [
			{ at: now - 30 * DAY, equity: 1000n, netContributions: 1000n },
			{ at: now - 12 * HOUR, equity: 1100n, netContributions: 1000n },
			{ at: now, equity: 1100n, netContributions: 1000n },
		],
	});

	const day = rankLeaderboard([earlyGain, recentGain], "24h", now);
	const all = rankLeaderboard([earlyGain, recentGain], "all", now);

	expect(day.map((entry) => entry.userId)).toEqual(["recent-gain", "early-gain"]);
	expect(day[0]?.returnBps).toBe(1_000n);
	expect(day[1]?.returnBps).toBe(0n);
	expect(all.map((entry) => entry.userId)).toEqual(["early-gain", "recent-gain"]);
});

test("accounts younger than the range are ranked from inception", () => {
	const fresh = candidate("fresh", {
		equity: 1200n,
		netContributions: 1000n,
		history: [{ at: now - 6 * HOUR, equity: 1200n, netContributions: 1000n }],
	});
	fresh.createdAt = now - 8 * HOUR;
	fresh.baselineAt = now - 8 * HOUR;

	const result = rankLeaderboard([fresh], "7d", now);

	expect(result[0]?.returnBps).toBe(2_000n);
	expect(result[0]?.pnl).toBe(200n);
});

test("leaderboard gives exact return ties the same rank", () => {
	const result = rankLeaderboard(
		[
			candidate("small", { equity: 1100n, netContributions: 1000n }),
			candidate("large", { equity: 5500n, netContributions: 5000n }),
			candidate("next", { equity: 1050n, netContributions: 1000n }),
		],
		"all",
		now,
	);

	expect(result.map(({ rank, position }) => ({ rank, position }))).toEqual([
		{ rank: 1, position: 1 },
		{ rank: 1, position: 2 },
		{ rank: 3, position: 3 },
	]);
});

test("leaderboard excludes candidates without a capital base", () => {
	const result = rankLeaderboard(
		[
			candidate("invalid", { baseline: 0n, equity: 1000n, netContributions: 0n }),
			candidate("valid", { equity: 1000n, netContributions: 1000n }),
		],
		"all",
		now,
	);

	expect(result.map((entry) => entry.userId)).toEqual(["valid"]);
});

test("range ranking keeps accounts that had no capital at the range start", () => {
	const fundedLater = candidate("funded-later", {
		equity: 1200n,
		netContributions: 1000n,
		history: [
			{ at: now - 20 * DAY, equity: 0n, netContributions: 0n },
			{ at: now - 2 * DAY, equity: 1100n, netContributions: 1000n },
			{ at: now, equity: 1200n, netContributions: 1000n },
		],
	});

	const result = rankLeaderboard([fundedLater], "7d", now);

	expect(result).toHaveLength(1);
	expect(result[0]?.denominator).toBe(1000n);
	expect(result[0]?.pnl).toBe(200n);
	expect(result[0]?.returnBps).toBe(2_000n);
});

test("history compaction bounds points and keeps both ends", () => {
	const points = Array.from({ length: 5_000 }, (_, index) => {
		const at = now - (5_000 - index) * 10 * 60 * 1000;
		return {
			at,
			equity: 1000n + BigInt(index),
			netContributions: 1000n,
		};
	});

	const compacted = compactLeaderboardHistory(points, now);

	expect(compacted.length).toBeLessThanOrEqual(MAX_LEADERBOARD_HISTORY_POINTS);
	expect(compacted[0]?.at).toBe(points[0]?.at);
	expect(compacted[compacted.length - 1]?.at).toBe(points[points.length - 1]?.at);
});

test("range history keeps one point before the cutoff", () => {
	const points = [
		{ at: now - 2 * DAY, equity: 900n, netContributions: 1000n },
		{ at: now - 12 * HOUR, equity: 1050n, netContributions: 1000n },
		{ at: now, equity: 1100n, netContributions: 1000n },
	];

	const windowed = leaderboardHistoryForRange(points, "24h", now);

	expect(windowed[0]?.at).toBe(now - 2 * DAY);
	expect(windowed[windowed.length - 1]?.at).toBe(now);
	expect(windowed.length).toBe(3);
});
