import { beforeAll, expect, test } from "bun:test";
import { waitForSystemReady, type ApiClient } from "../helpers/api";
import { createTestUser } from "../helpers/users";
import { waitFor } from "../helpers/wait-for";

beforeAll(waitForSystemReady);

function waitForHistory(client: ApiClient, expectedEntries: number) {
	return waitFor(
		() => client.getBalanceHistory("?limit=100"),
		(response) =>
			response.status === 200 &&
			response.data.entries.length >= expectedEntries &&
			response.data.pagination.total >= expectedEntries,
		{ description: `balance history with ${expectedEntries} entries` },
	);
}

function waitForHistoryReason(client: ApiClient, reason: string) {
	return waitFor(
		() => client.getBalanceHistory(`?asset=USD&reason=${encodeURIComponent(reason)}`),
		(response) => response.status === 200 && response.data.entries.length > 0,
		{ description: `balance history reason ${reason}` },
	);
}

test("balance history lists projected ledger entries with totals", async () => {
	const user = await createTestUser("balance-history");
	const response = await waitForHistory(user.client, 1);

	expect(response.status).toBe(200);
	expect(response.data.entries[0]).toMatchObject({
		asset: "USD",
		available: "10000.00",
		locked: "0.00",
		total: "10000.00",
		deltaTotal: "10000.00",
		reason: "initialized",
		referenceId: null,
		symbol: null,
	});
	expect(response.data.pagination).toMatchObject({
		page: 1,
		limit: 100,
		total: 1,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	});
	expect(response.data.assets).toEqual([
		expect.objectContaining({
			asset: "USD",
			available: "10000.00",
			locked: "0.00",
			total: "10000.00",
			netChange: "10000.00",
			entryCount: 1,
		}),
	]);
	expect(response.data.filtered).toEqual({ entryCount: 1, netChange: null });
});

test("balance history paginates and filters by asset and reason", async () => {
	const user = await createTestUser("balance-history-filters");
	await user.client.claimDailyCredit();
	const order = await user.client.createOrder({
		type: "LIMIT",
		side: "BUY",
		symbol: "ETH_USD",
		price: "100.00",
		qty: "1.000",
	});
	expect(order.status).toBe(201);

	await waitForHistoryReason(user.client, "order.locked");
	const history = await waitForHistory(user.client, 3);
	const entries = history.data.entries.map((entry) => entry.reason);
	expect(entries).toHaveLength(3);
	expect(entries).toEqual(expect.arrayContaining(["credited", "initialized", "order.locked"]));

	const firstPage = await user.client.getBalanceHistory("?limit=2&page=1");
	expect(firstPage.data.entries).toHaveLength(2);
	expect(firstPage.data.pagination).toMatchObject({
		page: 1,
		limit: 2,
		total: 3,
		totalPages: 2,
		hasNextPage: true,
		hasPreviousPage: false,
	});

	const secondPage = await user.client.getBalanceHistory("?limit=2&page=2");
	expect(secondPage.data.entries).toHaveLength(1);
	expect(secondPage.data.pagination).toMatchObject({
		page: 2,
		hasNextPage: false,
		hasPreviousPage: true,
	});
	const paginatedReasons = [...firstPage.data.entries, ...secondPage.data.entries]
		.map((entry) => entry.reason)
		.sort();
	expect(paginatedReasons).toEqual(["credited", "initialized", "order.locked"]);

	const credited = await user.client.getBalanceHistory("?asset=USD&reason=credited");
	expect(credited.data.pagination.total).toBe(1);
	expect(credited.data.entries[0]).toMatchObject({
		asset: "USD",
		reason: "credited",
		deltaTotal: "100.00",
	});
	expect(credited.data.filtered).toEqual({ entryCount: 1, netChange: "100.00" });

	const locked = await user.client.getBalanceHistory("?asset=USD&reason=order.locked");
	expect(locked.data.entries).toHaveLength(1);
	expect(locked.data.entries[0]).toMatchObject({
		asset: "USD",
		available: "10000.00",
		locked: "100.00",
		deltaAvailable: "-100.00",
		deltaLocked: "100.00",
		deltaTotal: "0.00",
		symbol: "ETH_USD",
	});
	expect(locked.data.filtered).toEqual({ entryCount: 1, netChange: "0.00" });

	const unmatched = await user.client.getBalanceHistory("?asset=BTC&reason=credited");
	expect(unmatched.data.entries).toEqual([]);
	expect(unmatched.data.pagination.total).toBe(0);
	expect(unmatched.data.filtered).toEqual({ entryCount: 0, netChange: "0.0000" });
});

test("balance series returns the asset trajectory and a total valuation", async () => {
	const user = await createTestUser("balance-series");
	await user.client.claimDailyCredit();
	await waitForHistory(user.client, 2);

	const assetSeries = await user.client.getBalanceSeries("?asset=USD&range=30d");
	expect(assetSeries.status).toBe(200);
	expect(assetSeries.data).toMatchObject({
		mode: "asset",
		asset: "USD",
		unit: "USD",
		precision: 2,
		partial: false,
		range: "30d",
		current: { available: "10100.00", locked: "0.00", total: "10100.00" },
		change: "100.00",
	});
	expect(assetSeries.data.points.length).toBeGreaterThanOrEqual(2);
	expect(assetSeries.data.points.at(-1)).toMatchObject({
		available: "10100.00",
		locked: "0.00",
		total: "10100.00",
	});
	expect(assetSeries.data.points.every((point) => Number(point.total) <= 10100)).toBe(true);

	const totalSeries = await user.client.getBalanceSeries("?range=7d");
	expect(totalSeries.status).toBe(200);
	expect(totalSeries.data).toMatchObject({
		mode: "total",
		asset: null,
		unit: "USD",
		precision: 2,
		partial: false,
		range: "7d",
		current: { available: "10100.00", locked: "0.00", total: "10100.00" },
		change: "100.00",
	});
	expect(totalSeries.data.points.at(-1)).toMatchObject({ total: "10100.00" });
});

test("balance history endpoints validate filters", async () => {
	const user = await createTestUser("balance-history-validation");

	expect(await user.client.getBalanceHistory("?limit=101")).toMatchObject({
		status: 400,
		data: { error: { code: "VALIDATION_ERROR" } },
	});
	expect(await user.client.getBalanceHistory("?page=0")).toMatchObject({
		status: 400,
		data: { error: { code: "VALIDATION_ERROR" } },
	});
	expect(await user.client.getBalanceHistory("?reason=unknown")).toMatchObject({
		status: 400,
		data: { error: { code: "VALIDATION_ERROR" } },
	});
	expect(await user.client.getBalanceSeries("?range=1y")).toMatchObject({
		status: 400,
		data: { error: { code: "VALIDATION_ERROR" } },
	});
});
