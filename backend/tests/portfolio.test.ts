import { expect, test } from "bun:test";
import { fromBigInt } from "../src/utils/convert";
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

test("formats negative fixed-point values", () => {
	expect(fromBigInt(-1n, 2)).toBe("-0.01");
	expect(fromBigInt(-100n, 2)).toBe("-1.00");
	expect(fromBigInt(-100n, 0)).toBe("-100");
});
