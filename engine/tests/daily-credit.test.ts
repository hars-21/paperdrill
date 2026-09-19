import { beforeEach, expect, test } from "bun:test";
import { applyCreditHandler } from "../src/handlers/applyCredit";
import { APPLIED_CREDITS, BALANCES } from "../src/store";
import { resetState } from "./utils";

beforeEach(resetState);

test("a daily credit is applied only once for the same credit id", async () => {
	const payload = { creditId: "daily-credit-1", userId: "3", asset: "USD", amount: "10000" };

	const first = await applyCreditHandler(payload);
	const duplicate = await applyCreditHandler(payload);

	expect(first.applied).toBe(true);
	expect(duplicate.applied).toBe(false);
	expect(BALANCES["3"]?.USD).toEqual({ available: 10000n, locked: 0n });
	expect(APPLIED_CREDITS.has("daily-credit-1")).toBe(true);
});

test("a rejected credit id remains retryable", async () => {
	const payload = { creditId: "daily-credit-2", userId: "3", asset: "UNKNOWN", amount: "10000" };

	await expect(applyCreditHandler(payload)).rejects.toThrow("Unknown asset: UNKNOWN");
	expect(APPLIED_CREDITS.has("daily-credit-2")).toBe(false);
});
