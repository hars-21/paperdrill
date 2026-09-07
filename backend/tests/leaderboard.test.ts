import { expect, test } from "bun:test";
import { isLeaderboardStale, rankLeaderboard } from "../src/utils/leaderboard";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

test("leaderboard ranks exact returns across different baselines", () => {
	const result = rankLeaderboard([
		{ userId: "gain-10", createdAt, baseline: 1000n, equity: 1100n },
		{ userId: "gain-20", createdAt, baseline: 5000n, equity: 6000n },
		{ userId: "loss", createdAt, baseline: 1000n, equity: 900n },
	]);

	expect(result.map((entry) => entry.userId)).toEqual(["gain-20", "gain-10", "loss"]);
	expect(result.map((entry) => entry.pnl)).toEqual([1000n, 100n, -100n]);
});

test("leaderboard gives exact return ties the same rank", () => {
	const result = rankLeaderboard([
		{ userId: "small", createdAt, baseline: 1000n, equity: 1100n },
		{ userId: "large", createdAt, baseline: 5000n, equity: 5500n },
		{ userId: "next", createdAt, baseline: 1000n, equity: 1050n },
	]);

	expect(result.map(({ rank, position }) => ({ rank, position }))).toEqual([
		{ rank: 1, position: 1 },
		{ rank: 1, position: 2 },
		{ rank: 3, position: 3 },
	]);
});

test("leaderboard excludes invalid zero baselines", () => {
	const result = rankLeaderboard([
		{ userId: "invalid", createdAt, baseline: 0n, equity: 1000n },
		{ userId: "valid", createdAt, baseline: 1000n, equity: 1000n },
	]);

	expect(result.map((entry) => entry.userId)).toEqual(["valid"]);
});

test("leaderboard becomes stale after two refresh intervals", () => {
	const asOf = new Date("2026-01-01T00:00:00.000Z");

	expect(isLeaderboardStale(asOf, asOf.getTime() + 120_000)).toBe(false);
	expect(isLeaderboardStale(asOf, asOf.getTime() + 120_001)).toBe(true);
});
