import { config } from "./config";

let lastPrice: number | null = null;
let lastFetch = 0;

export async function getMidPrice() {
	const now = Date.now();

	if (lastPrice && now - lastFetch < config.priceRefreshMs) {
		return lastPrice;
	}
	try {
		const product = config.market.replace("_", "-");
		const res = await fetch(
			`https://api.exchange.coinbase.com/products/${product}/ticker`,
		);
		if (!res.ok) throw new Error(`Price request failed with ${res.status}`);

		const data = (await res.json()) as { bid?: string; ask?: string };
		const bid = Number(data.bid);
		const ask = Number(data.ask);
		if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) {
			throw new Error("Invalid price data");
		}

		lastPrice = (bid + ask) / 2;
		lastFetch = now;

		return lastPrice;
	} catch {
		return null;
	}
}
