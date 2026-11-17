import type { Pool } from "pg";
import type { PositionEventRecord, PositionState } from "./positions";

export interface PositionSnapshot {
	userId: string;
	asset: string;
	state: PositionState;
}

export async function persistPositionProjections(
	pool: Pool,
	events: PositionEventRecord[],
	positions: PositionSnapshot[],
	cursor: string | null,
) {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		for (let offset = 0; offset < events.length; offset += 500) {
			const chunk = events.slice(offset, offset + 500);
			const values: unknown[] = [];
			const rows = chunk.map((event, i) => {
				const b = i * 13;
				values.push(
					crypto.randomUUID(),
					event.fillId,
					event.userId,
					event.asset,
					event.symbol,
					event.side,
					event.price,
					event.qty,
					event.quoteAmount,
					event.costBasisBefore,
					event.costBasisAfter,
					event.realizedPnl,
					new Date(event.occurredAt),
				);
				const p = (n: number) => `$${b + n}`;
				return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ${p(12)}, ${p(13)})`;
			});

			await client.query(
				`INSERT INTO "PositionEvent" (id, "fillId", "userId", asset, symbol, side, price, qty, "quoteAmount", "costBasisBefore", "costBasisAfter", "realizedPnl", "occurredAt")
				 VALUES ${rows.join(", ")}
				 ON CONFLICT ("fillId", "userId") DO NOTHING`,
				values,
			);
		}

		for (let offset = 0; offset < positions.length; offset += 500) {
			const chunk = positions.slice(offset, offset + 500);
			const values: unknown[] = [];
			const rows = chunk.map(({ userId, asset, state }, i) => {
				const b = i * 13;
				values.push(
					userId,
					asset,
					state.qty,
					state.costBasis,
					state.realizedPnl,
					state.lastBuyPrice,
					state.lastBuyQty,
					state.lastBuyAt == null ? null : new Date(state.lastBuyAt),
					state.lastSellPrice,
					state.lastSellQty,
					state.lastSellAt == null ? null : new Date(state.lastSellAt),
					state.tradeCount,
					new Date(),
				);
				const p = (n: number) => `$${b + n}`;
				return `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${p(8)}, ${p(9)}, ${p(10)}, ${p(11)}, ${p(12)}, ${p(13)})`;
			});

			await client.query(
				`INSERT INTO "Position" ("userId", asset, qty, "costBasis", "realizedPnl", "lastBuyPrice", "lastBuyQty", "lastBuyAt", "lastSellPrice", "lastSellQty", "lastSellAt", "tradeCount", "updatedAt")
				 VALUES ${rows.join(", ")}
				 ON CONFLICT ("userId", asset) DO UPDATE SET
				   qty = EXCLUDED.qty,
				   "costBasis" = EXCLUDED."costBasis",
				   "realizedPnl" = EXCLUDED."realizedPnl",
				   "lastBuyPrice" = EXCLUDED."lastBuyPrice",
				   "lastBuyQty" = EXCLUDED."lastBuyQty",
				   "lastBuyAt" = EXCLUDED."lastBuyAt",
				   "lastSellPrice" = EXCLUDED."lastSellPrice",
				   "lastSellQty" = EXCLUDED."lastSellQty",
				   "lastSellAt" = EXCLUDED."lastSellAt",
				   "tradeCount" = EXCLUDED."tradeCount",
				   "updatedAt" = EXCLUDED."updatedAt"`,
				values,
			);
		}

		if (cursor != null) {
			await client.query(
				`INSERT INTO "ProjectionCursor" (name, "lastEventId", "updatedAt")
				 VALUES ($1, $2, now())
				 ON CONFLICT (name) DO UPDATE SET
				   "lastEventId" = EXCLUDED."lastEventId",
				   "updatedAt" = now()`,
				["positions", cursor],
			);
		}

		await client.query("COMMIT");
	} catch (err) {
		await client.query("ROLLBACK").catch(() => undefined);
		throw err;
	} finally {
		client.release();
	}
}
