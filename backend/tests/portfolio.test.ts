import { expect, test } from "bun:test";
import { buildProjectionView } from "../src/services/portfolio";
import { calculatePortfolio } from "../src/utils/portfolio";
import { formatPortfolioView } from "../src/utils/portfolioFormat";

const markets = [
	{
		symbol: "BTC_USD",
		baseAsset: "BTC",
		quoteAsset: "USD",
		pricePrecision: 2,
		qtyPrecision: 4,
	},
];

test("portfolio includes available and locked balances", () => {
	const portfolio = calculatePortfolio(
		{
			USD: { available: 800000n, locked: 100000n },
			BTC: { available: 7500n, locked: 2500n },
		},
		markets,
		new Map([["BTC_USD", { price: 2000000n, timestamp: 1 }]]),
	);

	expect(portfolio.equity).toBe(2900000n);
	expect(portfolio.positions.find((position) => position.asset === "BTC")?.value).toBe(
		2000000n,
	);
});

test("quote-only portfolio does not require a market price", () => {
	const portfolio = calculatePortfolio(
		{ USD: { available: 1000000n, locked: 0n } },
		markets,
		new Map(),
	);

	expect(portfolio.equity).toBe(1000000n);
});

test("unpriced assets are excluded and marked partial", () => {
	const portfolio = calculatePortfolio(
		{ USD: { available: 10000n, locked: 0n }, BTC: { available: 10000n, locked: 0n } },
		markets,
		new Map(),
	);

	expect(portfolio.partial).toBe(true);
	expect(portfolio.equity).toBe(10000n);
	expect(portfolio.positions.find((position) => position.asset === "BTC")).toBeUndefined();
});

test("portfolio values each asset using its market quantity precision", () => {
	const portfolio = calculatePortfolio(
		{
			USD: { available: 100000n, locked: 0n },
			BTC: { available: 10000n, locked: 0n },
			ETH: { available: 500n, locked: 0n },
		},
		[
			...markets,
			{
				symbol: "ETH_USD",
				baseAsset: "ETH",
				quoteAsset: "USD",
				pricePrecision: 2,
				qtyPrecision: 3,
			},
		],
		new Map([
			["BTC_USD", { price: 2000000n, timestamp: 10 }],
			["ETH_USD", { price: 100000n, timestamp: 20 }],
		]),
	);

	expect(portfolio.equity).toBe(2150000n);
	expect(portfolio.positions.find((position) => position.asset === "BTC")?.value).toBe(
		2000000n,
	);
	expect(portfolio.positions.find((position) => position.asset === "ETH")?.value).toBe(50000n);
});

test("portfolio rejects market metadata that cannot produce one quote valuation", () => {
	expect(() =>
		calculatePortfolio(
			{ USD: { available: 100000n, locked: 0n } },
			[
				...markets,
				{
					symbol: "ETH_EUR",
					baseAsset: "ETH",
					quoteAsset: "EUR",
					pricePrecision: 2,
					qtyPrecision: 3,
				},
			],
			new Map(),
		),
	).toThrow("PnL requires markets to share one quote asset");
});

test("projection view derives weighted-average cost and splits realised PnL", () => {
	const view = buildProjectionView({
		userId: "user-1",
		at: 2_000,
		markets,
		prices: new Map([["BTC_USD", 2_400_000n]]),
		positions: [
			{
				asset: "BTC",
				qty: 5_000n,
				costBasis: 1_000_000n,
				realizedPnl: 250_000n,
				lastBuyPrice: 2_000_000n,
				lastBuyQty: 5_000n,
				lastBuyAt: 1_000,
				lastSellPrice: null,
				lastSellQty: null,
				lastSellAt: null,
				tradeCount: 3,
			},
		],
		balances: [
			{ asset: "BTC", available: 5_000n, locked: 0n },
			{ asset: "USD", available: 8_750_000n, locked: 250_000n },
		],
		netContributions: 10_000_000n,
		contributionsAt: 500,
	});

	expect(view).toMatchObject({
		quoteAsset: "USD",
		quotePrecision: 2,
		source: "projection",
		partial: false,
		cash: 9_000_000n,
		positionsValue: 1_200_000n,
		equity: 10_200_000n,
		costBasis: 1_000_000n,
		realizedPnl: 250_000n,
		unrealizedPnl: 200_000n,
	});
	expect(view.positions[0]).toMatchObject({
		asset: "BTC",
		qty: 5_000n,
		averageCost: 2_000_000n,
		markPrice: 2_400_000n,
		value: 1_200_000n,
		unrealizedPnl: 200_000n,
	});
});

test("projection view falls back to average cost and flags missing marks", () => {
	const view = buildProjectionView({
		userId: "user-1",
		at: 2_000,
		markets,
		prices: new Map(),
		positions: [
			{
				asset: "BTC",
				qty: 5_000n,
				costBasis: 1_000_000n,
				realizedPnl: 0n,
				lastBuyPrice: null,
				lastBuyQty: null,
				lastBuyAt: null,
				lastSellPrice: null,
				lastSellQty: null,
				lastSellAt: null,
				tradeCount: 1,
			},
		],
		balances: [],
		netContributions: 10_000_000n,
		contributionsAt: null,
	});

	expect(view.partial).toBe(true);
	expect(view.positions[0]).toMatchObject({
		markPrice: 2_000_000n,
		value: 1_000_000n,
		unrealizedPnl: 0n,
		partial: true,
	});
});

test("projection view includes balances that have no projected position", () => {
	const view = buildProjectionView({
		userId: "user-1",
		at: 2_000,
		markets,
		prices: new Map([["BTC_USD", 2_400_000n]]),
		positions: [],
		balances: [
			{ asset: "BTC", available: 2_500n, locked: 0n },
			{ asset: "USD", available: 1_000_000n, locked: 0n },
		],
		netContributions: 1_000_000n,
		contributionsAt: null,
	});

	expect(view.partial).toBe(true);
	expect(view.positionsValue).toBe(600_000n);
	expect(view.positions[0]).toMatchObject({
		asset: "BTC",
		qty: 2_500n,
		costBasis: 0n,
		unrealizedPnl: 600_000n,
		partial: true,
	});
});

test("formatted portfolio reports losses with a signed percentage", () => {
	const view = buildProjectionView({
		userId: "user-1",
		at: 2_000,
		markets,
		prices: new Map(),
		positions: [],
		balances: [{ asset: "USD", available: 2_500_000n, locked: 0n }],
		netContributions: 3_000_000n,
		contributionsAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
	});

	const result = formatPortfolioView(view);

	expect(result).toMatchObject({
		equity: "25000.00",
		netContributions: "30000.00",
		totalPnl: "-5000.00",
		totalPnlPercent: "-16.67",
		baselineEquity: "30000.00",
		pnl: "-5000.00",
		pnlPercent: "-16.67",
		baselineAt: "2026-01-01T00:00:00.000Z",
	});
});

test("formatted portfolio keeps PnL unknown when the baseline is missing", () => {
	const view = buildProjectionView({
		userId: "user-1",
		at: 2_000,
		markets,
		prices: new Map(),
		positions: [],
		balances: [{ asset: "USD", available: 2_500_000n, locked: 0n }],
		netContributions: null,
		contributionsAt: null,
	});

	const result = formatPortfolioView(view);

	expect(result).toMatchObject({
		equity: "25000.00",
		netContributions: null,
		totalPnl: null,
		totalPnlPercent: null,
	});
});
