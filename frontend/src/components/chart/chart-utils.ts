import { TickMarkType, type IChartApi, type Time, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/types";

export const CHART_RANGES = ["All", "3M", "1M", "3D", "1D"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

const RANGE_SECONDS: Record<ChartRange, number | null> = {
	All: null,
	"3M": 90 * 24 * 60 * 60,
	"1M": 30 * 24 * 60 * 60,
	"3D": 3 * 24 * 60 * 60,
	"1D": 24 * 60 * 60,
};

function token(name: string, fallback: string) {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function getChartColors() {
	return {
		text: token("--muted-foreground", "#8e8e93"),
		grid: token("--border", "#1e1e24"),
		crosshair: token("--chart-crosshair", "#3e3e48"),
		up: token("--green-text", "#00c087"),
		down: token("--red-text", "#ff3b30"),
		volumeUp: token("--green-bg", "#1a3a2a"),
		volumeDown: token("--red-bg", "#3a1a1a"),
	};
}

export function formatTick(time: Time, type: TickMarkType) {
	const date = new Date(Number(time) * 1000);
	if (type === TickMarkType.Year) return date.toLocaleDateString([], { year: "numeric" });
	if (type === TickMarkType.Month)
		return date.toLocaleDateString([], { month: "short", year: "2-digit" });
	if (type === TickMarkType.DayOfMonth)
		return date.toLocaleDateString([], { month: "short", day: "numeric" });
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatChartTime(time: Time) {
	return new Date(Number(time) * 1000).toLocaleString([], {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

export function applyChartRange(chart: IChartApi, candles: Candle[], range: ChartRange) {
	const first = candles[0];
	const last = candles[candles.length - 1];
	if (!first || !last) return;
	const seconds = RANGE_SECONDS[range];
	if (seconds === null) {
		chart.timeScale().fitContent();
		return;
	}
	const firstTime = Math.floor(first.time / 1000);
	const lastTime = Math.floor(last.time / 1000);
	chart.timeScale().setVisibleRange({
		from: Math.max(firstTime, lastTime - seconds) as UTCTimestamp,
		to: lastTime as UTCTimestamp,
	});
}
