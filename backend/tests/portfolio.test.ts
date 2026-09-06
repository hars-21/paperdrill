import { expect, test } from "bun:test";
import { formatPortfolio } from "../src/utils/formatter";
import { calculatePortfolio } from "../src/utils/portfolio";

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

test("non-zero assets require a reference price", () => {
	expect(() =>
		calculatePortfolio(
			{ BTC: { available: 10000n, locked: 0n } },
			markets,
			new Map(),
		),
	).toThrow("Reference price unavailable for BTC_USD");
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

test("formatted portfolio reports losses with a signed percentage", () => {
	const result = formatPortfolio(
		{
			quoteAsset: "USD",
			quotePrecision: 2,
			equity: 2500000n,
			positions: [],
		},
		3000000n,
		new Date("2026-01-01T00:00:00.000Z"),
	);

	expect(result).toMatchObject({
		equity: "25000.00",
		baselineEquity: "30000.00",
		pnl: "-5000.00",
		pnlPercent: "-16.66",
		baselineAt: "2026-01-01T00:00:00.000Z",
	});
});
