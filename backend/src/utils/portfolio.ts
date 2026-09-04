import type { MarketMetadata } from "../store/market";

export interface Balance {
	available: bigint;
	locked: bigint;
}

export interface ReferencePrice {
	price: bigint;
	timestamp: number;
}

export interface PortfolioPosition {
	asset: string;
	available: bigint;
	locked: bigint;
	total: bigint;
	precision: number;
	markPrice: bigint;
	value: bigint;
	markTimestamp: number | null;
}

export function calculatePortfolio(
	balances: Record<string, Balance>,
	markets: MarketMetadata[],
	prices: Map<string, ReferencePrice>,
) {
	const quoteAssets = new Set(markets.map((market) => market.quoteAsset));

	if (quoteAssets.size !== 1) {
		throw new Error("PnL requires markets to share one quote asset");
	}

	const quoteAsset = quoteAssets.values().next().value as string;
	const quotePrecisions = new Set(markets.map((market) => market.pricePrecision));

	if (quotePrecisions.size !== 1) {
		throw new Error("PnL requires one quote precision across markets");
	}

	const quotePrecision = quotePrecisions.values().next().value as number;
	const positions: PortfolioPosition[] = [];
	let equity = 0n;

	for (const [asset, balance] of Object.entries(balances)) {
		const total = balance.available + balance.locked;

		if (asset === quoteAsset) {
			positions.push({
				asset,
				...balance,
				total,
				precision: quotePrecision,
				markPrice: 10n ** BigInt(quotePrecision),
				value: total,
				markTimestamp: null,
			});
			equity += total;
			continue;
		}

		const market = markets.find((item) => item.baseAsset === asset);
		if (!market) {
			if (total !== 0n) throw new Error(`No market available to value ${asset}`);
			continue;
		}

		const mark = prices.get(market.symbol);
		if (!mark) {
			if (total !== 0n) throw new Error(`Reference price unavailable for ${market.symbol}`);
			continue;
		}

		const value = (total * mark.price) / 10n ** BigInt(market.qtyPrecision);
		positions.push({
			asset,
			...balance,
			total,
			precision: market.qtyPrecision,
			markPrice: mark.price,
			value,
			markTimestamp: mark.timestamp,
		});
		equity += value;
	}

	return { quoteAsset, quotePrecision, equity, positions };
}
