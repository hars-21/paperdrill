export type PositionSide = "BUY" | "SELL";

export interface PositionState {
	qty: bigint;
	costBasis: bigint;
	realizedPnl: bigint;
	lastBuyPrice: bigint | null;
	lastBuyQty: bigint | null;
	lastBuyAt: number | null;
	lastSellPrice: bigint | null;
	lastSellQty: bigint | null;
	lastSellAt: number | null;
	tradeCount: number;
}

export interface PositionFillInput {
	fillId: string;
	userId: string;
	asset: string;
	symbol: string;
	side: PositionSide;
	price: bigint;
	qty: bigint;
	occurredAt: number;
	qtyPrecision: number;
}

export interface PositionEventRecord {
	fillId: string;
	userId: string;
	asset: string;
	symbol: string;
	side: PositionSide;
	price: bigint;
	qty: bigint;
	quoteAmount: bigint;
	costBasisBefore: bigint;
	costBasisAfter: bigint;
	realizedPnl: bigint;
	occurredAt: number;
}

export interface PositionChange {
	before: PositionState;
	after: PositionState;
	event: PositionEventRecord;
}

export function emptyPosition(): PositionState {
	return {
		qty: 0n,
		costBasis: 0n,
		realizedPnl: 0n,
		lastBuyPrice: null,
		lastBuyQty: null,
		lastBuyAt: null,
		lastSellPrice: null,
		lastSellQty: null,
		lastSellAt: null,
		tradeCount: 0,
	};
}

export function positionKey(userId: string, asset: string) {
	return `${userId}:${asset}`;
}

export function quoteAmount(price: bigint, qty: bigint, qtyPrecision: number) {
	return (price * qty) / 10n ** BigInt(qtyPrecision);
}

export function applyPositionChange(
	before: PositionState,
	input: PositionFillInput,
): PositionChange {
	const amount = quoteAmount(input.price, input.qty, input.qtyPrecision);

	if (input.side === "BUY") {
		const after: PositionState = {
			...before,
			qty: before.qty + input.qty,
			costBasis: before.costBasis + amount,
			lastBuyPrice: input.price,
			lastBuyQty: input.qty,
			lastBuyAt: input.occurredAt,
			tradeCount: before.tradeCount + 1,
		};

		return {
			before,
			after,
			event: {
				fillId: input.fillId,
				userId: input.userId,
				asset: input.asset,
				symbol: input.symbol,
				side: input.side,
				price: input.price,
				qty: input.qty,
				quoteAmount: amount,
				costBasisBefore: before.costBasis,
				costBasisAfter: after.costBasis,
				realizedPnl: 0n,
				occurredAt: input.occurredAt,
			},
		};
	}

	let removedCost =
		before.qty === 0n ? 0n : (before.costBasis * input.qty) / before.qty;
	if (removedCost > before.costBasis) removedCost = before.costBasis;

	const qtyAfter = before.qty > input.qty ? before.qty - input.qty : 0n;
	const costBasisAfter = qtyAfter === 0n ? 0n : before.costBasis - removedCost;
	const realizedPnl = amount - removedCost;

	const after: PositionState = {
		...before,
		qty: qtyAfter,
		costBasis: costBasisAfter,
		realizedPnl: before.realizedPnl + realizedPnl,
		lastSellPrice: input.price,
		lastSellQty: input.qty,
		lastSellAt: input.occurredAt,
		tradeCount: before.tradeCount + 1,
	};

	return {
		before,
		after,
		event: {
			fillId: input.fillId,
			userId: input.userId,
			asset: input.asset,
			symbol: input.symbol,
			side: input.side,
			price: input.price,
			qty: input.qty,
			quoteAmount: amount,
			costBasisBefore: before.costBasis,
			costBasisAfter,
			realizedPnl,
			occurredAt: input.occurredAt,
		},
	};
}
