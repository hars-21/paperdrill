import type { EngineEventRecord, MakerBalance, MakerOrder } from "./types";

export function balanceKey(userId: string, asset: string) {
	return `${userId}:${asset}`;
}

export class MakerState {
	private readonly orders = new Map<string, MakerOrder>();
	private readonly balances = new Map<string, MakerBalance>();

	constructor(private readonly ownerUserIds: ReadonlySet<string>) {}

	apply(record: EngineEventRecord): void {
		if (record.version !== 1) return;

		const event = record.event;

		switch (event.type) {
			case "order.created":
			case "order.partially_filled":
				if (!this.ownerUserIds.has(event.order.userId)) return;
				this.orders.set(event.order.id, { ...event.order });
				return;
			case "order.filled":
			case "order.cancelled":
				// Deleting an unknown id is harmless and also clears orders that
				// were placed before this process started.
				this.orders.delete(event.order.id);
				return;
			case "balance.changed":
				if (!this.ownerUserIds.has(event.userId)) return;
				this.balances.set(balanceKey(event.userId, event.asset), {
					available: event.available,
					locked: event.locked,
				});
				return;
			default:
				return;
		}
	}

	ordersFor(userId: string, symbol: string): MakerOrder[] {
		return [...this.orders.values()].filter(
			(order) =>
				order.userId === userId &&
				order.symbol === symbol &&
				(order.status === "OPEN" || order.status === "PARTIALLY_FILLED"),
		);
	}

	forget(orderId: string): void {
		this.orders.delete(orderId);
	}

	balance(userId: string, asset: string): MakerBalance {
		return this.balances.get(balanceKey(userId, asset)) ?? { available: 0n, locked: 0n };
	}

	credit(userId: string, asset: string, amount: bigint): void {
		const key = balanceKey(userId, asset);
		const current = this.balances.get(key) ?? { available: 0n, locked: 0n };
		this.balances.set(key, { ...current, available: current.available + amount });
	}

	get orderCount(): number {
		return this.orders.size;
	}
}
