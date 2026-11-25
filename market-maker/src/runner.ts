import { ensureFunds, type FundableMarket } from "./funding";
import type { CommandWriter } from "./engine";
import { logger } from "./logger";
import { buildLadder, planRequotes } from "./quote";
import type { MakerState } from "./state";
import { toNumber } from "./decimal";

export interface MarketRunnerDeps {
	market: FundableMarket;
	userId: string;
	anchorScaled: bigint;
	maxTopUpNotional: number;
	writer: CommandWriter;
	state: MakerState;
	now?: number;
}

export async function runMarketCycle({
	market,
	userId,
	anchorScaled,
	maxTopUpNotional,
	writer,
	state,
	now = Date.now(),
}: MarketRunnerDeps): Promise<{ cancelled: number; created: number }> {
	await ensureFunds({ market, userId, anchorScaled, state, writer, maxTopUpNotional });

	const available = {
		base: toNumber(state.balance(userId, market.baseAsset).available, market.qtyPrecision),
		quote: toNumber(state.balance(userId, market.quoteAsset).available, market.pricePrecision),
	};

	const ladder = buildLadder(market, anchorScaled, available);
	const plan = planRequotes(market, ladder, state.ordersFor(userId, market.symbol), now);

	for (const order of plan.cancel) {
		try {
			await writer.cancelOrder({ userId, id: order.id });
			state.forget(order.id);
		} catch (err) {
			logger.error("Cancel failed", err, { symbol: market.symbol, orderId: order.id });
		}
	}

	let created = 0;
	for (const quote of plan.create) {
		const id = crypto.randomUUID();
		try {
			await writer.createOrder({
				id,
				userId,
				symbol: market.symbol,
				side: quote.side,
				priceScaled: quote.priceScaled,
				qtyScaled: quote.qtyScaled,
			});
			created++;
		} catch (err) {
			logger.error("Create failed", err, { symbol: market.symbol, orderId: id });
		}
	}

	return { cancelled: plan.cancel.length, created };
}
