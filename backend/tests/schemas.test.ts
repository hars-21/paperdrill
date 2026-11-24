import { expect, test } from "bun:test";
import { usernameSchema } from "../src/schema/onboarding";
import {
	balanceHistoryQuerySchema,
	balanceHistorySeriesQuerySchema,
	orderBodySchema,
	orderQuerySchema,
} from "../src/schema/exchange";
import { leaderboardQuerySchema } from "../src/schema/leaderboard";
import { rewardClaimParamsSchema } from "../src/schema/rewards";

test("username validation accepts canonical leaderboard handles", () => {
	expect(usernameSchema.safeParse("trader_01").success).toBe(true);
	expect(usernameSchema.safeParse("ab").success).toBe(false);
	expect(usernameSchema.safeParse("bad-name").success).toBe(false);
});

test("leaderboard pagination applies public query limits", () => {
	expect(leaderboardQuerySchema.safeParse({ limit: "25", offset: "0" }).success).toBe(true);
	expect(leaderboardQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
	expect(leaderboardQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
	expect(leaderboardQuerySchema.safeParse({ range: "7d" }).success).toBe(true);
	expect(leaderboardQuerySchema.safeParse({ range: "90d" }).success).toBe(false);
});

test("reward claims only accept supported reward kinds", () => {
	expect(rewardClaimParamsSchema.safeParse({ kind: "initial" }).success).toBe(true);
	expect(rewardClaimParamsSchema.safeParse({ kind: "daily" }).success).toBe(true);
	expect(rewardClaimParamsSchema.safeParse({ kind: "weekly" }).success).toBe(false);
	expect(rewardClaimParamsSchema.safeParse({ kind: "STARTER" }).success).toBe(false);
});

test("order input accepts the two supported order shapes", () => {
	expect(
		orderBodySchema.safeParse({
			type: "LIMIT",
			side: "BUY",
			symbol: "BTC_USD",
			price: "100.25",
			qty: "0.5",
		}).success,
	).toBe(true);

	expect(
		orderBodySchema.safeParse({
			type: "MARKET",
			side: "SELL",
			symbol: "BTC_USD",
			qty: "0.5",
		}).success,
	).toBe(true);
});

test("order input rejects values that could create invalid engine orders", () => {
	const invalidOrders = [
		{ type: "LIMIT", side: "BUY", symbol: "BTC_USD", qty: "1" },
		{ type: "LIMIT", side: "BUY", symbol: "BTC_USD", price: "100", qty: "-1" },
		{ type: "LIMIT", side: "INVALID", symbol: "BTC_USD", price: "100", qty: "1" },
		{ type: "MARKET", side: "BUY", symbol: "BTC_USD", qty: "1e3" },
	];

	for (const input of invalidOrders) {
		expect(orderBodySchema.safeParse(input).success).toBe(false);
	}
});

test("order-history pagination rejects non-positive and fractional values", () => {
	for (const query of [{ limit: "0" }, { page: "-1" }, { limit: "1.5" }]) {
		expect(orderQuerySchema.safeParse(query).success).toBe(false);
	}
});

test("balance-history filters accept bounded pagination and known reasons", () => {
	expect(
		balanceHistoryQuerySchema.safeParse({
			asset: "USD",
			reason: "fill.settled",
			page: "2",
			limit: "100",
		}).success,
	).toBe(true);
	expect(
		balanceHistoryQuerySchema.safeParse({ page: "0", limit: "20" }).success,
	).toBe(false);
	expect(
		balanceHistoryQuerySchema.safeParse({ page: "1", limit: "101" }).success,
	).toBe(false);
	expect(
		balanceHistoryQuerySchema.safeParse({ reason: "unknown" }).success,
	).toBe(false);
});

test("balance-series ranges are restricted to supported windows", () => {
	for (const range of ["24h", "7d", "30d", "90d", "all"]) {
		expect(balanceHistorySeriesQuerySchema.safeParse({ range }).success).toBe(true);
	}
	expect(balanceHistorySeriesQuerySchema.safeParse({ range: "1y" }).success).toBe(false);
	expect(balanceHistorySeriesQuerySchema.safeParse({ asset: "USD" }).success).toBe(true);
});
