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
}
