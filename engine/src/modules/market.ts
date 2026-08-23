import { pool } from "../db";
import { ORDERBOOK } from "../store";
import type { Market } from "../types/domain";
import { logger } from "../util/logger";

interface MarketMetadata {
	symbol: string;
	baseAsset: string;
	quoteAsset: string;
	pricePrecision: number;
	qtyPrecision: number;
}

function applyMarkets(markets: MarketMetadata[]) {
	for (const key of Object.keys(ORDERBOOK)) delete ORDERBOOK[key];

	for (const metadata of markets) {
		ORDERBOOK[metadata.symbol] = {
			baseAsset: metadata.baseAsset,
			quoteAsset: metadata.quoteAsset,
			pricePrecision: metadata.pricePrecision,
			qtyPrecision: metadata.qtyPrecision,
			bestBid: null,
			bestAsk: null,
			bids: new Map(),
			asks: new Map(),
		};
	}

	logger.info(`Loaded ${markets.length} markets from database`);
}

export async function initMarkets() {
	try {
		const { rows } = await pool.query<MarketMetadata>(
			`SELECT symbol, "baseAsset", "quoteAsset", "pricePrecision", "qtyPrecision" FROM "Market"`,
		);

		if (rows.length === 0) {
			throw new Error("No markets found in database");
		}

		applyMarkets(rows);
	} catch (err) {
		logger.error("Failed to load markets from database", err);
		throw err;
	}
}

export function getMarket(symbol: string): Market {
	const market = ORDERBOOK[symbol];
	if (!market) throw new Error(`Unknown market: ${symbol}`);
	return market;
}
