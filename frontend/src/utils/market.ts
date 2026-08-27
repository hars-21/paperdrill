import type { Ticker } from "@/types";

export function formatPrice(t?: Ticker | null): string {
	if (!t?.lastPrice) return "—";
	const n = Number(t.lastPrice);
	if (!Number.isFinite(n) || n === 0) return "—";
	return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatVolume(t?: Ticker | null): string {
	if (!t?.quoteVolume) return "—";
	const n = Number(t.quoteVolume);
	if (!Number.isFinite(n) || n === 0) return "—";
	if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
	if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
	return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatChange(t?: Ticker | null): { text: string; isUp: boolean } {
	const pct = t?.priceChangePercent;
	if (pct == null || !Number.isFinite(pct)) return { text: "0.00%", isUp: true };
	return {
		text: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
		isUp: pct >= 0,
	};
}
