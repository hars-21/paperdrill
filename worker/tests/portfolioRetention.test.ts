import { expect, test } from "bun:test";
import { retentionWindows } from "../src/portfolioRetention";

const DAY_MS = 24 * 60 * 60 * 1000;

test("retention keeps recent detail and thins older history", () => {
	const now = Date.UTC(2026, 10, 15, 12);
	const windows = retentionWindows(now);

	expect(windows.cutoff.getTime()).toBe(now - 365 * DAY_MS);
	expect(windows.hourlyBefore.getTime()).toBe(now - 1 * DAY_MS);
	expect(windows.dailyBefore.getTime()).toBe(now - 7 * DAY_MS);
	expect(windows.weeklyBefore.getTime()).toBe(now - 30 * DAY_MS);

	expect(windows.cutoff.getTime()).toBeLessThan(windows.weeklyBefore.getTime());
	expect(windows.weeklyBefore.getTime()).toBeLessThan(windows.dailyBefore.getTime());
	expect(windows.dailyBefore.getTime()).toBeLessThan(windows.hourlyBefore.getTime());
	expect(windows.hourlyBefore.getTime()).toBeLessThan(now);
});
