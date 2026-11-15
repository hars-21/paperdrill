import { afterAll, beforeAll, expect, test } from "bun:test";
import { waitForSystemReady } from "../helpers/api";
import { EngineClient } from "../helpers/engine";
import { createTestUser } from "../helpers/users";
import { waitFor } from "../helpers/wait-for";

const engine = new EngineClient();

interface PortfolioPositionResponse {
	asset: string;
	symbol: string | null;
	qty: string;
	available: string;
	locked: string;
	costBasis: string | null;
	averageCost: string | null;
	markPrice: string | null;
	value: string;
	realizedPnl: string | null;
	unrealizedPnl: string | null;
	lastBuyPrice: string | null;
	tradeCount: number | null;
	partial: boolean;
}

interface PortfolioResponse {
	quoteAsset: string;
	asOf: string;
	source: "live" | "projection" | "engine";
	partial: boolean;
	cash: string;
	positionsValue: string;
	equity: string;
	netContributions: string | null;
	totalPnl: string | null;
	positions: PortfolioPositionResponse[];
}

interface PositionDetailResponse {
	asset: string;
	symbol: string | null;
	quoteAsset: string;
	position: PortfolioPositionResponse;
	trading: {
		fills: number;
		buys: number;
		sells: number;
		realizedPnl: string | null;
	};
}

interface PositionEventsResponse {
	asset: string;
	events: {
		fillId: string;
		symbol: string;
		side: string;
		price: string;
		qty: string;
		quoteAmount: string;
		costBasisAfter: string;
		realizedPnl: string;
	}[];
	pagination: { page: number; total: number; totalPages: number };
}

interface AnalyticsResponse {
	allocation: { asset: string; percent: number | null }[];
	performance: {
		asset: string;
		realizedPnl: string | null;
		tradeCount: number | null;
	}[];
	trading: {
		events: number;
		buys: number;
		sells: number;
		winningSells: number;
		losingSells: number;
	};
}

interface HistoryResponse {
	quoteAsset: string;
	points: { at: string; equity: string }[];
}

beforeAll(async () => {
	await engine.connect();
	await waitForSystemReady();
});

afterAll(async () => {
	await engine.close();
});

test("portfolio endpoints expose projected positions and trade history", async () => {
	const buyer = await createTestUser("portfolio-buyer");
	const seed = await createTestUser("portfolio-seed");
	const at = Date.now();
	const fill = {
		id: crypto.randomUUID(),
		symbol: "ETH_USD",
		price: "100000",
		qty: "5000",
		buyOrderId: crypto.randomUUID(),
		sellOrderId: crypto.randomUUID(),
		buyerId: buyer.id,
		sellerId: seed.id,
		isBuyerMaker: false,
		createdAt: at,
	};

	await engine.addEngineEvent({
		id: crypto.randomUUID(),
		type: "fill.created",
		version: 1,
		occurredAt: at,
		event: { type: "fill.created", fill },
	});

	// Balances only move on settlement, so mirror the engine's follow-up events.
	for (const balance of [
		{
			userId: buyer.id,
			asset: "ETH",
			available: "5000",
			locked: "0",
			deltaAvailable: "5000",
			deltaLocked: "0",
		},
		{
			userId: buyer.id,
			asset: "USD",
			available: "500000",
			locked: "0",
			deltaAvailable: "-500000",
			deltaLocked: "0",
		},
	]) {
		await engine.addEngineEvent({
			id: crypto.randomUUID(),
			type: "balance.changed",
			version: 1,
			occurredAt: at,
			event: {
				type: "balance.changed",
				...balance,
				reason: "fill.settled",
				referenceId: fill.id,
				symbol: fill.symbol,
				occurredAt: at,
			},
		});
	}

	const portfolio = await waitFor(
		async () => {
			const response = await buyer.client.request<PortfolioResponse>("/v1/portfolio");
			return response.data;
		},
		(data) =>
			data?.positions?.some(
				(position) =>
					position.asset === "ETH" &&
					position.qty === "5.000" &&
					position.available === "5.000",
			),
		{ description: "portfolio position", timeoutMs: 15000 },
	);

	expect(portfolio).toMatchObject({ quoteAsset: "USD", netContributions: "10000.00" });
	expect(
		portfolio.positions.find((position) => position.asset === "ETH"),
	).toMatchObject({
		qty: "5.000",
		available: "5.000",
		locked: "0.000",
		costBasis: "5000.00",
		averageCost: "1000.00",
		lastBuyPrice: "1000.00",
		tradeCount: 1,
	});

	const detail = await buyer.client.request<PositionDetailResponse>(
		"/v1/portfolio/positions/eth",
	);
	expect(detail.status).toBe(200);
	expect(detail.data).toMatchObject({
		asset: "ETH",
		symbol: "ETH_USD",
		quoteAsset: "USD",
	});
	expect(detail.data.position).toMatchObject({
		qty: "5.000",
		averageCost: "1000.00",
	});
	expect(detail.data.trading).toMatchObject({
		fills: 1,
		buys: 1,
		sells: 0,
		realizedPnl: "0.00",
	});

	const events = await buyer.client.request<PositionEventsResponse>(
		"/v1/portfolio/positions/ETH/events?limit=10",
	);
	expect(events.status).toBe(200);
	expect(events.data.events).toHaveLength(1);
	expect(events.data.events[0]).toMatchObject({
		fillId: fill.id,
		symbol: "ETH_USD",
		side: "BUY",
		price: "1000.00",
		qty: "5.000",
		quoteAmount: "5000.00",
		costBasisAfter: "5000.00",
		realizedPnl: "0.00",
	});
	expect(events.data.pagination).toMatchObject({ page: 1, total: 1, totalPages: 1 });

	const analytics = await waitFor(
		async () => {
			const response =
				await buyer.client.request<AnalyticsResponse>("/v1/portfolio/analytics");
			return response.data;
		},
		(data) => data?.trading?.events === 1,
		{ description: "portfolio analytics", timeoutMs: 15000 },
	);

	expect(analytics.trading).toMatchObject({
		events: 1,
		buys: 1,
		sells: 0,
		winningSells: 0,
		losingSells: 0,
	});
	expect(analytics.allocation.find((entry) => entry.asset === "ETH")).toBeTruthy();
	expect(analytics.performance.find((entry) => entry.asset === "ETH")).toMatchObject({
		realizedPnl: "0.00",
		tradeCount: 1,
	});

	const history = await waitFor(
		async () => {
			const response = await buyer.client.request<HistoryResponse>(
				"/v1/portfolio/history?range=24h",
			);
			return response.data;
		},
		(data) => (data?.points?.length ?? 0) > 0,
		{ description: "portfolio history", timeoutMs: 25000 },
	);

	expect(history.quoteAsset).toBe("USD");
	expect(history.points.length).toBeGreaterThan(0);
	expect(history.points.every((point) => typeof point.equity === "string")).toBe(true);

	const missing = await buyer.client.request("/v1/portfolio/positions/DOGE");
	expect(missing).toMatchObject({
		status: 404,
		data: { error: { code: "POSITION_NOT_FOUND" } },
	});
});
