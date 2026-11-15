import { Pool } from "pg";
import { env } from "./env";

export interface PersistedOrder {
	id: string;
	userId: string;
	symbol: string;
	price: string | null;
	qty: string;
	filledQty: string;
	status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
	lockedAmount: string | null;
	spentAmount: string;
	averagePrice: string | null;
}

export interface PersistedFill {
	id: string;
	symbol: string;
	price: string;
	qty: string;
	buyOrderId: string;
	sellOrderId: string;
	buyerId: string;
	sellerId: string;
}

export interface PersistedDailyCredit {
	userId: string;
	creditDate: Date;
	asset: string;
	amount: string;
	status: "PENDING" | "APPLIED";
}

export interface PersistedBalance {
	userId: string;
	asset: string;
	available: string;
	locked: string;
}

export interface PersistedBalanceHistory {
	id: string;
	userId: string;
	asset: string;
	available: string;
	locked: string;
	deltaAvailable: string;
	deltaLocked: string;
	reason: string;
	referenceId: string | null;
	symbol: string | null;
}

export interface PersistedPosition {
	userId: string;
	asset: string;
	qty: string;
	costBasis: string;
	realizedPnl: string;
	lastBuyPrice: string | null;
	lastBuyQty: string | null;
	lastSellPrice: string | null;
	lastSellQty: string | null;
	tradeCount: number;
}

export interface PersistedPositionEvent {
	fillId: string;
	userId: string;
	asset: string;
	side: "BUY" | "SELL";
	price: string;
	qty: string;
	quoteAmount: string;
	costBasisBefore: string;
	costBasisAfter: string;
	realizedPnl: string;
}

export class TestDatabase {
	private readonly pool = new Pool({ connectionString: env.databaseUrl });

	async close() {
		await this.pool.end();
	}

	async order(id: string): Promise<PersistedOrder | undefined> {
		const result = await this.pool.query<PersistedOrder>(
			`SELECT id, "userId", symbol, price::text, qty::text, "filledQty"::text,
			        status, "lockedAmount"::text, "spentAmount"::text, "averagePrice"::text
			 FROM "Order" WHERE id = $1`,
			[id],
		);
		return result.rows[0];
	}

	async fill(id: string): Promise<PersistedFill | undefined> {
		const result = await this.pool.query<PersistedFill>(
			`SELECT id, symbol, price::text, qty::text, "buyOrderId", "sellOrderId",
			        "buyerId", "sellerId"
			 FROM "Fill" WHERE id = $1`,
			[id],
		);
		return result.rows[0];
	}

	async fillCount(id: string): Promise<number> {
		const result = await this.pool.query<{ count: string }>(
			`SELECT COUNT(*)::text AS count FROM "Fill" WHERE id = $1`,
			[id],
		);
		return Number(result.rows[0]?.count ?? 0);
	}

	async dailyCredits(userId: string): Promise<PersistedDailyCredit[]> {
		const result = await this.pool.query<PersistedDailyCredit>(
			`SELECT "userId", "creditDate", asset, amount::text, status
			 FROM "DailyCredit" WHERE "userId" = $1 ORDER BY "creditDate"`,
			[userId],
		);
		return result.rows;
	}

	async pnlBaseline(userId: string): Promise<string | undefined> {
		const result = await this.pool.query<{ pnlBaseline: string }>(
			`SELECT "pnlBaseline"::text FROM "User" WHERE id = $1`,
			[userId],
		);
		return result.rows[0]?.pnlBaseline;
	}

	async balance(userId: string, asset: string): Promise<PersistedBalance | undefined> {
		const result = await this.pool.query<PersistedBalance>(
			`SELECT "userId", asset, available::text, locked::text
			 FROM "Balance" WHERE "userId" = $1 AND asset = $2`,
			[userId, asset],
		);
		return result.rows[0];
	}

	async balanceHistory(id: string): Promise<PersistedBalanceHistory | undefined> {
		const result = await this.pool.query<PersistedBalanceHistory>(
			`SELECT id, "userId", asset, available::text, locked::text,
			        "deltaAvailable"::text, "deltaLocked"::text, reason, "referenceId", symbol
			 FROM "BalanceHistory" WHERE id = $1`,
			[id],
		);
		return result.rows[0];
	}

	async balanceHistoryCount(id: string): Promise<number> {
		const result = await this.pool.query<{ count: string }>(
			`SELECT COUNT(*)::text AS count FROM "BalanceHistory" WHERE id = $1`,
			[id],
		);
		return Number(result.rows[0]?.count ?? 0);
	}

	async balanceHistoryByReference(referenceId: string): Promise<PersistedBalanceHistory[]> {
		const result = await this.pool.query<PersistedBalanceHistory>(
			`SELECT id, "userId", asset, available::text, locked::text,
			        "deltaAvailable"::text, "deltaLocked"::text, reason, "referenceId", symbol
			 FROM "BalanceHistory" WHERE "referenceId" = $1 ORDER BY "occurredAt"`,
			[referenceId],
		);
		return result.rows;
	}

	async position(userId: string, asset: string): Promise<PersistedPosition | undefined> {
		const result = await this.pool.query<PersistedPosition>(
			`SELECT "userId", asset, qty::text, "costBasis"::text, "realizedPnl"::text,
			        "lastBuyPrice"::text, "lastBuyQty"::text, "lastSellPrice"::text,
			        "lastSellQty"::text, "tradeCount"
			 FROM "Position" WHERE "userId" = $1 AND asset = $2`,
			[userId, asset],
		);
		return result.rows[0];
	}

	async positionEvent(
		fillId: string,
		userId: string,
	): Promise<PersistedPositionEvent | undefined> {
		const result = await this.pool.query<PersistedPositionEvent>(
			`SELECT "fillId", "userId", asset, side, price::text, qty::text,
			        "quoteAmount"::text, "costBasisBefore"::text, "costBasisAfter"::text,
			        "realizedPnl"::text
			 FROM "PositionEvent" WHERE "fillId" = $1 AND "userId" = $2`,
			[fillId, userId],
		);
		return result.rows[0];
	}

	async positionEventCount(fillId: string, userId: string): Promise<number> {
		const result = await this.pool.query<{ count: string }>(
			`SELECT COUNT(*)::text AS count FROM "PositionEvent"
			 WHERE "fillId" = $1 AND "userId" = $2`,
			[fillId, userId],
		);
		return Number(result.rows[0]?.count ?? 0);
	}
}
