export function formatPrice(n?: string | number | null, pricePrecision: number = 2) {
	if (n === undefined || n === null || n === "" || !Number.isFinite(Number(n))) return "—";

	return Number(n).toLocaleString(undefined, {
		minimumFractionDigits: pricePrecision,
		maximumFractionDigits: pricePrecision,
	});
}

export function formatQty(n?: string | number | null, qtyPrecision: number = 4) {
	if (n === undefined || n === null || n === "" || !Number.isFinite(Number(n))) return "—";

	return Number(n).toLocaleString(undefined, {
		minimumFractionDigits: qtyPrecision,
		maximumFractionDigits: qtyPrecision,
	});
}

export function formatVolume(vol?: string | number) {
	if (!vol) return "—";

	const n = Number(vol);
	if (!Number.isFinite(n)) return "—";

	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
	return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatChange(pct?: string | number): { text: string; isUp: boolean } {
	if (pct == null || !Number.isFinite(Number(pct))) return { text: "0.00%", isUp: true };

	const n = Number(pct);
	return {
		text: `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`,
		isUp: n >= 0,
	};
}

export function formatTime(ts: string | number) {
	return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export function formatDateTime(ts: string | number) {
	const date = new Date(ts);
	if (!Number.isFinite(date.getTime())) return "—";
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}
