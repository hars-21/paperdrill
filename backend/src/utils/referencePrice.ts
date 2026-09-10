import { cacheClient } from "../redis";
import type { MarketMetadata } from "../store/market";
import type { ReferencePrice } from "../utils/portfolio";

export async function getReferencePrices(markets: MarketMetadata[]) {
	const prices = new Map<string, ReferencePrice>();

	await Promise.all(
		markets.map(async (market) => {
			const raw = await cacheClient.get(`market:ticker:${market.symbol}`);
			if (!raw) return;

			const ticker = JSON.parse(raw);
			if (!ticker.lastPrice || !Number.isFinite(ticker.timestamp)) return;

			prices.set(market.symbol, {
				price: BigInt(ticker.lastPrice),
				timestamp: ticker.timestamp,
			});
		}),
	);

	return prices;
}
