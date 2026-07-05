import { prisma } from "../db";
import { logger } from "../utils/logger";

interface Market {
	pricePrecision: number;
	qtyPrecision: number;
}

export const marketStore = new Map<string, Market>();
export const assetPrecision = new Map<string, number>();

const FALLBACK_MARKETS: Record<string, Market> = {
	BTC_USD: { pricePrecision: 2, qtyPrecision: 4 },
	ETH_USD: { pricePrecision: 2, qtyPrecision: 3 },
	SOL_USD: { pricePrecision: 2, qtyPrecision: 2 },
};

function setMarket(symbol: string, pricePrecision: number, qtyPrecision: number, baseAsset: string, quoteAsset: string) {
	marketStore.set(symbol, { pricePrecision, qtyPrecision });
	if (!assetPrecision.has(baseAsset)) assetPrecision.set(baseAsset, qtyPrecision);
	if (!assetPrecision.has(quoteAsset)) assetPrecision.set(quoteAsset, pricePrecision);
}

export async function loadMarkets(): Promise<void> {
	try {
		const marketData = await prisma.market.findMany();
		for (const item of marketData) {
			setMarket(item.symbol, item.pricePrecision, item.quantityPrecision, item.baseAsset, item.quoteAsset);
		}

		if (marketData.length > 0) {
			logger.info(`Loaded ${marketData.length} markets from database`);
			return;
		}

		logger.warn("No markets found in database, using fallback defaults");
	} catch (err) {
		logger.error("Failed to load markets from database, using fallback defaults", err);
	}

	for (const [symbol, m] of Object.entries(FALLBACK_MARKETS)) {
		const parts = symbol.split("_");
		setMarket(symbol, m.pricePrecision, m.qtyPrecision, parts[0]!, parts[1]!);
	}
	logger.info(`Loaded ${marketStore.size} fallback markets`);
}
