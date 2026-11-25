import { scaledFromNumber } from "./decimal";

type GetClient = { get: (key: string) => Promise<string | null> };

export interface PriceConfig {
	tickerKeyPrefix: string;
	tickerMaxAgeMs: number;
	oracleCacheMs: number;
	oracleTimeoutMs: number;
	pricePrecision: number;
}

interface CachedOraclePrice {
	price: bigint;
	at: number;
}

const oracleCache = new Map<string, CachedOraclePrice>();

function readTicker(raw: string, config: PriceConfig): bigint | null {
	try {
		const ticker = JSON.parse(raw) as { lastPrice?: string; timestamp?: number };
		const lastPrice = ticker.lastPrice;
		const timestamp = ticker.timestamp;

		if (typeof lastPrice !== "string" || typeof timestamp !== "number") return null;
		if (!Number.isFinite(timestamp) || Date.now() - timestamp > config.tickerMaxAgeMs) return null;

		const price = BigInt(lastPrice);
		return price > 0n ? price : null;
	} catch {
		return null;
	}
}

async function readOracle(
	symbol: string,
	config: PriceConfig,
	fetchImpl: typeof fetch,
): Promise<bigint | null> {
	const cached = oracleCache.get(symbol);
	if (cached && Date.now() - cached.at < config.oracleCacheMs) return cached.price;

	const product = symbol.replace("_", "-");

	try {
		const response = await fetchImpl(`https://api.exchange.coinbase.com/products/${product}/ticker`, {
			signal: AbortSignal.timeout(config.oracleTimeoutMs),
		});
		if (!response.ok) return null;

		const data = (await response.json()) as { bid?: string; ask?: string };
		const bid = Number(data.bid);
		const ask = Number(data.ask);
		if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return null;

		const price = scaledFromNumber((bid + ask) / 2, config.pricePrecision);
		if (price <= 0n) return null;

		oracleCache.set(symbol, { price, at: Date.now() });
		return price;
	} catch {
		return null;
	}
}

export async function getAnchorScaled(
	symbol: string,
	client: GetClient,
	config: PriceConfig,
	fetchImpl: typeof fetch = fetch,
): Promise<bigint | null> {
	try {
		const raw = await client.get(`${config.tickerKeyPrefix}${symbol}`);
		if (raw) {
			const tickerPrice = readTicker(raw, config);
			if (tickerPrice) return tickerPrice;
		}
	} catch {
		// fall through to the oracle
	}

	return readOracle(symbol, config, fetchImpl);
}
