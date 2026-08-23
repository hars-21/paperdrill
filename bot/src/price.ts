import { config } from "./config";

let lastPrice: number | null = null;
let lastFetch = 0;

const IDS: Record<string, string> = {
	BTC_USD: "bitcoin",
	ETH_USD: "ethereum",
	SOL_USD: "solana",
};

const fallbackPrice: Record<string, number> = {
	BTC_USD: 65949,
	ETH_USD: 1920,
	SOL_USD: 77,
};

export async function getMidPrice() {
	const now = Date.now();

	if (lastPrice && now - lastFetch < config.priceRefreshMs) {
		return lastPrice;
	}
	try {
		const id = IDS[config.market];
		if (!id) throw new Error(`No price source configured for ${config.market}`);

		const res = await fetch(
			`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
		);

		const data = (await res.json()) as Record<string, { usd: number }>;
		const entry = data[id];
		if (!entry) throw new Error("No price data");

		lastPrice = entry.usd;
		lastFetch = now;

		return lastPrice;
	} catch {
		if (lastPrice) {
			return lastPrice;
		}

		const fallback = fallbackPrice[config.market];
		if (fallback == null) throw new Error(`No fallback price configured for ${config.market}`);
		return fallback;
	}
}
