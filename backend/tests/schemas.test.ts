import { expect, test } from "bun:test";
import { signinSchema, signupSchema } from "../src/schema/auth";
import { orderBodySchema, orderQuerySchema } from "../src/schema/exchange";
import { leaderboardQuerySchema } from "../src/schema/leaderboard";

test("account credentials reject malformed or missing identity fields", () => {
	const invalidSignups = [
		{ email: "not-an-email", name: "alice", password: "secret123" },
		{ email: "alice@test.com", name: " ", password: "secret123" },
		{ email: "alice@test.com", name: "alice", password: "" },
		{ email: "alice@test.com", name: "a".repeat(41), password: "secret123" },
	];

	for (const input of invalidSignups) {
		expect(signupSchema.safeParse(input).success).toBe(false);
	}

	expect(signinSchema.safeParse({ email: "alice@test.com", password: "" }).success).toBe(false);
});

test("leaderboard pagination applies public query limits", () => {
	expect(leaderboardQuerySchema.safeParse({ limit: "25", offset: "0" }).success).toBe(true);
	expect(leaderboardQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
	expect(leaderboardQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
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
