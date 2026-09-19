import { afterAll, beforeAll, expect, test } from "bun:test";
import { ApiClient, waitForSystemReady } from "../helpers/api";
import { createTestUser } from "../helpers/users";
import { TestDatabase } from "../setup/database";

const database = new TestDatabase();

beforeAll(waitForSystemReady);
afterAll(() => database.close());

test("daily credit is concurrent-safe and does not count as profit", async () => {
	const user = await createTestUser("daily-credit");
	const claims = await Promise.all(Array.from({ length: 5 }, () => user.client.claimDailyCredit()));

	expect(claims.every((claim) => claim.status === 200)).toBe(true);
	expect(claims.filter((claim) => claim.data.credited)).toHaveLength(1);
	expect(claims[0]?.data).toMatchObject({ asset: "USD", amount: "100.00" });

	expect(await user.client.getBalances()).toMatchObject({
		status: 200,
		data: { USD: { available: "10100.00", locked: "0.00" } },
	});
	expect(await user.client.getPortfolio()).toMatchObject({
		status: 200,
		data: {
			quoteAsset: "USD",
			equity: "10100.00",
			baselineEquity: "10100.00",
			pnl: "0.00",
			pnlPercent: "0.00",
		},
	});

	expect(await user.client.claimDailyCredit()).toMatchObject({
		status: 200,
		data: { credited: false, asset: "USD", amount: "100.00" },
	});
	expect(await database.dailyCredits(user.id)).toEqual([
		expect.objectContaining({
			userId: user.id,
			asset: "USD",
			amount: "10000",
			status: "APPLIED",
		}),
	]);
	expect(await database.pnlBaseline(user.id)).toBe("1010000");
});

test("daily credit requires an authenticated session", async () => {
	const anonymous = new ApiClient();
	expect(await anonymous.claimDailyCredit()).toMatchObject({
		status: 401,
		data: {
			error: {
				code: "AUTHENTICATION_REQUIRED",
				message: "Authentication required",
			},
		},
	});
});
