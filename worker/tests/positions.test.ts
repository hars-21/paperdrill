import { expect, test } from "bun:test";
import {
	applyPositionChange,
	emptyPosition,
	positionKey,
	quoteAmount,
	type PositionFillInput,
} from "../src/positions";
import { compareStreamIds, maxStreamId } from "../src/stream";

const QTY_PRECISION = 4;

function fill(overrides: Partial<PositionFillInput> = {}): PositionFillInput {
	return {
		fillId: crypto.randomUUID(),
		userId: "user-1",
		asset: "BTC",
		symbol: "BTC_USD",
		side: "BUY",
		price: 2_000_000n,
		qty: 5_000n,
		occurredAt: 1_000,
		qtyPrecision: QTY_PRECISION,
		...overrides,
	};
}

test("quoteAmount matches engine settlement precision", () => {
	expect(quoteAmount(2_000_000n, 5_000n, QTY_PRECISION)).toBe(1_000_000n);
});

test("buy adds quantity and cost basis", () => {
	const change = applyPositionChange(emptyPosition(), fill());

	expect(change.after).toMatchObject({
		qty: 5_000n,
		costBasis: 1_000_000n,
		realizedPnl: 0n,
		lastBuyPrice: 2_000_000n,
		lastBuyQty: 5_000n,
		lastBuyAt: 1_000,
		tradeCount: 1,
	});
	expect(change.event).toMatchObject({
		side: "BUY",
		quoteAmount: 1_000_000n,
		costBasisBefore: 0n,
		costBasisAfter: 1_000_000n,
		realizedPnl: 0n,
	});
});

test("partial sell realises proportional profit and keeps average cost", () => {
	const first = applyPositionChange(emptyPosition(), fill());
	const second = applyPositionChange(
		first.after,
		fill({
			side: "BUY",
			price: 2_400_000n,
			qty: 2_500n,
			occurredAt: 2_000,
		}),
	);

	expect(second.after).toMatchObject({
		qty: 7_500n,
		costBasis: 1_600_000n,
	});

	const sell = applyPositionChange(
		second.after,
		fill({
			side: "SELL",
			price: 3_000_000n,
			qty: 2_500n,
			occurredAt: 3_000,
		}),
	);

	expect(sell.after).toMatchObject({
		qty: 5_000n,
		costBasis: 1_066_667n,
		realizedPnl: 216_667n,
		lastSellPrice: 3_000_000n,
		lastSellQty: 2_500n,
		lastSellAt: 3_000,
		tradeCount: 3,
	});
	expect(sell.event).toMatchObject({
		side: "SELL",
		quoteAmount: 750_000n,
		costBasisBefore: 1_600_000n,
		costBasisAfter: 1_066_667n,
		realizedPnl: 216_667n,
	});
});

test("full sell clears cost basis and accumulates realised profit", () => {
	const position = {
		...emptyPosition(),
		qty: 5_000n,
		costBasis: 1_000_000n,
	};

	const change = applyPositionChange(
		position,
		fill({ side: "SELL", price: 2_500_000n, qty: 5_000n }),
	);

	expect(change.after).toMatchObject({
		qty: 0n,
		costBasis: 0n,
		realizedPnl: 250_000n,
	});
	expect(change.event.costBasisAfter).toBe(0n);
});

test("selling without a recorded position does not go negative", () => {
	const change = applyPositionChange(
		emptyPosition(),
		fill({ side: "SELL", price: 2_000_000n, qty: 1_000n }),
	);

	expect(change.after.qty).toBe(0n);
	expect(change.after.costBasis).toBe(0n);
	expect(change.after.realizedPnl).toBe(200_000n);
});

test("overselling clamps quantity and cost basis", () => {
	const change = applyPositionChange(
		{ ...emptyPosition(), qty: 1_000n, costBasis: 200_000n },
		fill({ side: "SELL", price: 2_000_000n, qty: 5_000n }),
	);

	expect(change.after.qty).toBe(0n);
	expect(change.after.costBasis).toBe(0n);
	expect(change.event.costBasisAfter).toBe(0n);
});

test("position keys separate users and assets", () => {
	expect(positionKey("user-1", "BTC")).not.toBe(positionKey("user-2", "BTC"));
	expect(positionKey("user-1", "BTC")).not.toBe(positionKey("user-1", "ETH"));
});

test("stream ids compare numerically and max picks the newest", () => {
	expect(compareStreamIds("10-0", "9-9")).toBe(1);
	expect(compareStreamIds("10-1", "10-0")).toBe(1);
	expect(compareStreamIds("10-1", "10-1")).toBe(0);
	expect(compareStreamIds("9999999999999-0", "10000000000000-0")).toBe(-1);
	expect(maxStreamId(null, "5-0")).toBe("5-0");
	expect(maxStreamId("5-0", "4-9")).toBe("5-0");
});
