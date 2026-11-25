import type { EngineEventRecord, MakerBalance, MakerFill, MakerOrder } from "./types";

function asObject(value: unknown, field: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${field} must be an object`);
	}
	return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
	if (typeof value !== "string" || !value) throw new Error(`${field} must be a string`);
	return value;
}

function asBig(value: unknown, field: string): bigint {
	if (typeof value === "bigint") return value;
	if (typeof value === "string" || typeof value === "number") {
		try {
			return BigInt(value);
		} catch {
			// fall through
		}
	}
	throw new Error(`${field} must be a scaled integer`);
}

function asNullableBig(value: unknown, field: string): bigint | null {
	return value === null ? null : asBig(value, field);
}

function reviveOrder(value: unknown): MakerOrder {
	const raw = asObject(value, "order");
	return {
		id: asString(raw.id, "order.id"),
		userId: asString(raw.userId, "order.userId"),
		side: asString(raw.side, "order.side") === "BUY" ? "BUY" : "SELL",
		type: asString(raw.type, "order.type") === "MARKET" ? "MARKET" : "LIMIT",
		symbol: asString(raw.symbol, "order.symbol"),
		price: asNullableBig(raw.price, "order.price"),
		qty: asBig(raw.qty, "order.qty"),
		filledQty: asBig(raw.filledQty, "order.filledQty"),
		status: asString(raw.status, "order.status") as MakerOrder["status"],
		createdAt: Number(raw.createdAt ?? 0),
	};
}

function reviveFill(value: unknown): MakerFill {
	const raw = asObject(value, "fill");
	return {
		id: asString(raw.id, "fill.id"),
		symbol: asString(raw.symbol, "fill.symbol"),
		price: asBig(raw.price, "fill.price"),
		qty: asBig(raw.qty, "fill.qty"),
		buyerId: asString(raw.buyerId, "fill.buyerId"),
		sellerId: asString(raw.sellerId, "fill.sellerId"),
		createdAt: Number(raw.createdAt ?? 0),
	};
}

function reviveBalance(value: unknown): MakerBalance {
	const raw = asObject(value, "balance");
	return {
		available: asBig(raw.available, "balance.available"),
		locked: asBig(raw.locked, "balance.locked"),
	};
}

const ORDER_TYPES = new Set([
	"order.created",
	"order.filled",
	"order.partially_filled",
	"order.cancelled",
]);

export function reviveEventRecord(raw: string): EngineEventRecord {
	const record = asObject(JSON.parse(raw), "record");
	const type = asString(record.type, "record.type");
	const event = asObject(record.event, "record.event");

	const base = {
		id: asString(record.id, "record.id"),
		type: type as EngineEventRecord["type"],
		version: Number(record.version ?? 0),
		occurredAt: Number(record.occurredAt ?? 0),
	};

	if (ORDER_TYPES.has(type)) {
		return { ...base, event: { type: base.type, order: reviveOrder(event.order) } } as EngineEventRecord;
	}

	if (type === "fill.created") {
		return { ...base, event: { type, fill: reviveFill(event.fill) } };
	}

	if (type === "depth.changed") {
		return {
			...base,
			event: {
				type,
				symbol: asString(event.symbol, "event.symbol"),
				side: event.side === "asks" ? "asks" : "bids",
				price: asBig(event.price, "event.price"),
				qty: asBig(event.qty, "event.qty"),
			},
		};
	}

	if (type === "balance.changed") {
		return {
			...base,
			event: {
				type,
				userId: asString(event.userId, "event.userId"),
				asset: asString(event.asset, "event.asset"),
				...reviveBalance(event),
				deltaAvailable: asBig(event.deltaAvailable, "event.deltaAvailable"),
				deltaLocked: asBig(event.deltaLocked, "event.deltaLocked"),
				reason: asString(event.reason, "event.reason"),
				referenceId: event.referenceId === null ? null : String(event.referenceId ?? ""),
				symbol: event.symbol === null || event.symbol === undefined ? null : String(event.symbol),
				occurredAt: Number(event.occurredAt ?? 0),
			},
		};
	}

	throw new Error(`Unsupported engine event type: ${type}`);
}
