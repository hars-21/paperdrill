import { toNumber } from "./decimal";
import type { CommandWriter } from "./engine";
import type { MakerState } from "./state";
import type { QuoteMarket } from "./quote";

export interface FundableMarket extends QuoteMarket {
	baseAsset: string;
	quoteAsset: string;
}

export interface FundingDeps {
	market: FundableMarket;
	userId: string;
	anchorScaled: bigint;
	state: MakerState;
	writer: Pick<CommandWriter, "deposit">;
	maxTopUpNotional: number;
}

async function topUp(
	deps: FundingDeps,
	asset: string,
	target: number,
	available: number,
	precision: number,
): Promise<boolean> {
	if (available >= target) return false;

	const factor = 10 ** precision;
	const cap = Math.ceil(deps.maxTopUpNotional * factor);
	const amount = Math.min(Math.ceil((target - available) * factor), cap);
	if (amount <= 0) return false;

	await deps.writer.deposit({
		userId: deps.userId,
		asset,
		amountScaled: BigInt(amount),
	});

	// The engine will publish the authoritative balance.changed event shortly;
	// this optimistic credit prevents a same-cycle order from being rejected.
	deps.state.credit(deps.userId, asset, BigInt(amount));
	return true;
}

export async function ensureFunds(deps: FundingDeps): Promise<{ base: boolean; quote: boolean }> {
	const { market, userId, state } = deps;
	const anchor = toNumber(deps.anchorScaled, market.pricePrecision);
	const notionalTarget = market.maxOrderNotional * market.levelsPerSide;

	const [base, quote] = await Promise.all([
		topUp(
			deps,
			market.baseAsset,
			notionalTarget / anchor,
			toNumber(state.balance(userId, market.baseAsset).available, market.qtyPrecision),
			market.qtyPrecision,
		),
		topUp(
			deps,
			market.quoteAsset,
			notionalTarget,
			toNumber(state.balance(userId, market.quoteAsset).available, market.pricePrecision),
			market.pricePrecision,
		),
	]);

	return { base, quote };
}
