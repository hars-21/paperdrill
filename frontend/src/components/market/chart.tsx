import { useEffect, useRef, useState } from "react";
import {
	createChart,
	CandlestickSeries,
	HistogramSeries,
	CrosshairMode,
	LineStyle,
	ColorType,
	type Time,
	type IPriceLine,
} from "lightweight-charts";
import type { Candle } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";

const INTERVALS = ["15M", "1H", "4H", "1D"] as const;
type Interval = (typeof INTERVALS)[number];

const INTERVAL_MS: Record<Interval, number> = {
	"15M": 15 * 60 * 1000,
	"1H": 60 * 60 * 1000,
	"4H": 4 * 60 * 60 * 1000,
	"1D": 24 * 60 * 60 * 1000,
};

function resolveThemeColor(v: string) {
	return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function hexToRgba(hex: string, a: number) {
	if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;
	const h = hex.replace("#", "");
	return `rgba(${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}, ${a})`;
}

function getChartColors() {
	const gt = resolveThemeColor("--green-text") || "#00C087";
	const rt = resolveThemeColor("--red-text") || "#FF3B30";
	const gb = resolveThemeColor("--green-bg") || "#1A3A2A";
	const rb = resolveThemeColor("--red-bg") || "#3A1A1A";
	const bd = resolveThemeColor("--border") || "#1E1E24";
	return {
		textColor: resolveThemeColor("--muted-foreground") || "#8E8E93",
		gridColor: hexToRgba(bd, 0.35),
		crosshairColor: resolveThemeColor("--chart-crosshair") || "#3E3E48",
		borderColor: bd,
		candleUp: gt,
		candleDown: rt,
		volumeUp: hexToRgba(gb, 0.5),
		volumeDown: hexToRgba(rb, 0.5),
	};
}

function fmtPrice(p?: string | number) {
	if (p === undefined) return "—";
	const n = Number(p);
	if (n >= 1000)
		return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	return n.toFixed(2);
}

function fmtVol(v?: string | number) {
	if (v === undefined) return "—";
	const n = Number(v);
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
	if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
	return n.toFixed(2);
}

function fmtChange(pct?: number | null) {
	if (pct === null || pct === undefined) return "—";
	return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
}

function getBucketStart(ms: number, intMs: number) {
	return ms - (ms % intMs);
}

function fillCandleGaps(candles: Candle[], intMs: number): Candle[] {
	if (candles.length < 2) return candles;
	const s = [...candles].sort((a, b) => a.time - b.time);
	const f = s[0];
	if (!f) return candles;
	const r: Candle[] = [f];
	for (let i = 1; i < s.length; i++) {
		const p = r[r.length - 1]!;
		const c = s[i]!;
		let g = p.time + intMs;
		while (g < c.time) {
			r.push({
				time: g,
				open: p.close,
				high: p.close,
				low: p.close,
				close: p.close,
				volume: "0",
				symbol: p.symbol || "",
			});
			g += intMs;
		}
		r.push(c);
	}
	return r;
}

function mergeMinuteCandle(into: Candle[], inc: Candle, intMs: number): Candle[] {
	const bs = getBucketStart(inc.time, intMs);
	const c = [...into];
	const l = c[c.length - 1];
	if (l) {
		let g = l.time + intMs;
		while (g < bs) {
			c.push({
				time: g,
				open: l.close,
				high: l.close,
				low: l.close,
				close: l.close,
				volume: "0",
				symbol: inc.symbol,
			});
			g += intMs;
		}
	}
	const b = c.find((x) => x.time === bs);
	if (b) {
		b.high = Number(inc.high) > Number(b.high) ? inc.high : b.high;
		b.low = Number(inc.low) < Number(b.low) ? inc.low : b.low;
		b.close = inc.close;
		b.volume = String(Number(b.volume) + Number(inc.volume));
	} else {
		c.push({ ...inc, time: bs });
	}
	return c;
}

function computeMarketStats(candles: Candle[]) {
	if (candles.length === 0) return null;
	const s = [...candles].sort((a, b) => a.time - b.time);
	const l = s[s.length - 1];
	if (!l) return null;
	const da = Date.now() - 86400000;
	const r = s.filter((x) => x.time >= da);
	const lp = Number(l.close);
	if (r.length < 2 || !r[0]) {
		return {
			lastPrice: lp,
			change: null,
			changePercent: null,
			high: Number(l.high),
			low: Number(l.low),
			volume: Number(l.volume),
		};
	}
	const pp = Number(r[0].open);
	const ch = lp - pp;
	return {
		lastPrice: lp,
		change: ch,
		changePercent: pp !== 0 ? (ch / pp) * 100 : 0,
		high: Math.max(...r.map((x) => Number(x.high))),
		low: Math.min(...r.map((x) => Number(x.low))),
		volume: r.reduce((s, x) => s + Number(x.volume), 0),
	};
}

const tzLabel = (() => {
	const o = -new Date().getTimezoneOffset();
	const h = Math.floor(Math.abs(o) / 60);
	const m = Math.abs(o) % 60;
	return `UTC${o >= 0 ? "+" : "-"}${h}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}`;
})();

export function Chart({ symbol }: { symbol: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hc, setHc] = useState<Partial<Candle> | null>(null);
	const [lc, setLc] = useState<Partial<Candle> | null>(null);
	const [hasData, setHasData] = useState(false);
	const [interval, setInterval] = useState<Interval>("1H");
	const [now, setNow] = useState(new Date());
	const cref = useRef<Candle[]>([]);
	const iref = useRef(interval);
	iref.current = interval;

	useEffect(() => {
		const t = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(t);
	}, []);

	useEffect(() => {
		if (!containerRef.current) return;

		const colors = getChartColors();
		const w = containerRef.current.clientWidth || 600;
		const h = containerRef.current.clientHeight || 260;

		const chart = createChart(containerRef.current, {
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: colors.textColor,
			},
			grid: {
				vertLines: { color: colors.gridColor, style: 1 },
				horzLines: { color: colors.gridColor, style: 1 },
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: { width: 1, color: colors.crosshairColor, style: 3 },
				horzLine: { width: 1, color: colors.crosshairColor, style: 3 },
			},
			rightPriceScale: { borderColor: colors.borderColor, autoScale: true },
			timeScale: {
				borderColor: colors.borderColor,
				timeVisible: interval !== "1D",
				secondsVisible: false,
				rightOffset: 5,
				barSpacing: 8,
				fixLeftEdge: true,
			},
			handleScroll: true,
			handleScale: true,
			width: w,
			height: h,
		});

		const cs = chart.addSeries(CandlestickSeries, {
			upColor: colors.candleUp,
			downColor: colors.candleDown,
			borderDownColor: colors.candleDown,
			borderUpColor: colors.candleUp,
			wickDownColor: colors.candleDown,
			wickUpColor: colors.candleUp,
			priceFormat: { type: "custom", formatter: fmtPrice, minMove: 0.01 },
		});

		const vs = chart.addSeries(HistogramSeries, {
			priceFormat: { type: "volume" },
			priceScaleId: "",
		});

		chart.priceScale("").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

		const curInt = iref.current;
		const intMs = INTERVAL_MS[curInt];

		let priceLine: IPriceLine | null = null;
		const updatePriceLine = (c: Candle) => {
			const up = Number(c.close) >= Number(c.open);
			if (priceLine) {
				priceLine.applyOptions({
					price: Number(c.close),
					color: up ? colors.candleUp : colors.candleDown,
				});
			} else {
				priceLine = cs.createPriceLine({
					price: Number(c.close),
					color: up ? colors.candleUp : colors.candleDown,
					lineWidth: 1,
					lineStyle: LineStyle.Dotted,
					axisLabelVisible: true,
				});
			}
		};

		api
			.getCandles(symbol, curInt)
			.then((res) => {
				const data = res?.data ?? [];
				if (data.length > 0) {
					const last = data[data.length - 1];
					if (!last) return;
					setLc({ ...last, time: last.time });
					setHasData(true);

					const raw: Candle[] = data.map((c) => ({ ...c, symbol, time: c.time }));
					const filled = fillCandleGaps(raw, intMs);
					cref.current = filled;

					cs.setData(
						filled.map((c) => ({
							time: Math.floor(c.time / 1000) as Time,
							open: Number(c.open),
							high: Number(c.high),
							low: Number(c.low),
							close: Number(c.close),
						})),
					);
					vs.setData(
						filled.map((c) => ({
							time: Math.floor(c.time / 1000) as Time,
							value: Number(c.volume),
							color: Number(c.close) >= Number(c.open) ? colors.volumeUp : colors.volumeDown,
						})),
					);
					updatePriceLine({ ...last, symbol });
				}
			})
			.catch(() => {});

		chart.subscribeCrosshairMove((p) => {
			if (p.point === undefined || !p.time || p.point.x < 0 || p.point.y < 0) {
				setHc(null);
				return;
			}
			const cd = p.seriesData.get(cs) as
				| { open?: number; high?: number; low?: number; close?: number }
				| undefined;
			const vd = p.seriesData.get(vs) as { value?: number } | undefined;
			if (cd)
				setHc({
					open: String(cd.open ?? ""),
					high: String(cd.high ?? ""),
					low: String(cd.low ?? ""),
					close: String(cd.close ?? ""),
					volume: String(vd?.value ?? 0),
				});
			else setHc(null);
		});

		const unsub = wsManager.subscribe(`candle:${symbol}`, (raw: unknown) => {
			if (!raw) return;
			const candle = raw as Candle;
			if (!candle.time || candle.open === undefined || candle.close === undefined) return;
			const m = INTERVAL_MS[iref.current];
			cref.current = mergeMinuteCandle(cref.current, candle, m);
			const merged = cref.current;
			cs.setData(
				merged.map((c) => ({
					time: Math.floor(c.time / 1000) as Time,
					open: Number(c.open),
					high: Number(c.high),
					low: Number(c.low),
					close: Number(c.close),
				})),
			);
			vs.setData(
				merged.map((c) => ({
					time: Math.floor(c.time / 1000) as Time,
					value: Number(c.volume),
					color: Number(c.close) >= Number(c.open) ? colors.volumeUp : colors.volumeDown,
				})),
			);
			const lastMerged = merged[merged.length - 1];
			if (lastMerged) updatePriceLine(lastMerged);
			setLc(candle);
			if (!hasData) setHasData(true);
		});

		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				const { width, height } = e.contentRect;
				if (width > 0 && height > 0) chart.applyOptions({ width, height });
			}
		});
		ro.observe(containerRef.current);

		return () => {
			unsub();
			ro.disconnect();
			chart.remove();
		};
	}, [symbol, interval]);

	const dc = hc || lc;
	const up = dc ? Number(dc.close ?? 0) >= Number(dc.open ?? 0) : true;
	const vc = up ? "text-green-text" : "text-red-text";
	const stats = computeMarketStats(cref.current);

	const ts = now.toLocaleTimeString([], {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	return (
		<div className="relative w-full h-full flex flex-col">
			<div className="flex items-center justify-between gap-4 px-4 pt-3 pb-2 shrink-0">
				<div className="flex items-center gap-2.5 min-w-0">
					<span className="text-sm text-high-emphasis whitespace-nowrap">
						{symbol.replace("_", "/")}
					</span>
				</div>

				<div className="flex items-center bg-card border border-border/40 rounded-lg p-0.5 shrink-0">
					{INTERVALS.map((int) => (
						<button
							key={int}
							onClick={() => setInterval(int)}
							className={`px-2.5 py-1 text-[10px] rounded-md transition-colors cursor-pointer ${
								interval === int
									? "bg-muted text-high-emphasis"
									: "text-medium-emphasis hover:text-high-emphasis hover:bg-muted/50"
							}`}
						>
							{int}
						</button>
					))}
				</div>
			</div>

			<div className="flex items-end justify-between gap-4 px-4 pb-3 shrink-0 flex-wrap">
				<div className="flex items-baseline gap-2.5 min-w-0">
					<span
						className={`text-xl tabular-nums ${
							stats && stats.changePercent !== null
								? stats.changePercent >= 0
									? "text-green-text"
									: "text-red-text"
								: "text-high-emphasis"
						}`}
					>
						{fmtPrice(stats?.lastPrice ?? dc?.close)}
					</span>
					{stats?.changePercent !== null && stats?.changePercent !== undefined && (
						<span
							className={`text-sm tabular-nums ${
								stats.changePercent >= 0 ? "text-green-text" : "text-red-text"
							}`}
						>
							{fmtChange(stats.changePercent)}
						</span>
					)}
				</div>

				<div className="hidden md:flex items-center gap-7 text-[11px] tabular-nums">
					<div className="flex flex-col gap-0.5">
						<span className="text-low-emphasis">24h High</span>
						<span className="font-medium text-medium-emphasis">{fmtPrice(stats?.high)}</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-low-emphasis">24h Low</span>
						<span className="font-medium text-medium-emphasis">{fmtPrice(stats?.low)}</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-low-emphasis">24h Vol</span>
						<span className="font-medium text-medium-emphasis">{fmtVol(stats?.volume)}</span>
					</div>
				</div>
			</div>

			<div className="relative flex-1 min-h-0 px-3 pb-3">
				<div className="relative h-full w-full overflow-hidden rounded-xl border border-border/20 bg-l0/30">
					<div ref={containerRef} className="h-full w-full" />

					{dc && (
						<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-3 rounded-lg border border-border/40 bg-card/80 px-3 py-1.5 text-[11px] tabular-nums shadow-sm backdrop-blur select-none pointer-events-none">
							<span className="font-medium text-medium-emphasis">
								O <span className={`${vc}`}>{fmtPrice(dc.open)}</span>
							</span>
							<span className="font-medium text-medium-emphasis">
								H <span className={`${vc}`}>{fmtPrice(dc.high)}</span>
							</span>
							<span className="font-medium text-medium-emphasis">
								L <span className={`${vc}`}>{fmtPrice(dc.low)}</span>
							</span>
							<span className="font-medium text-medium-emphasis">
								C <span className={`${vc}`}>{fmtPrice(dc.close)}</span>
							</span>
							<span className="font-medium text-medium-emphasis">
								V <span className="text-high-emphasis">{fmtVol(dc.volume)}</span>
							</span>
						</div>
					)}

					<div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 shadow-sm backdrop-blur select-none pointer-events-none">
						<span className="text-xs font-medium text-medium-emphasis tabular-nums">{ts}</span>
						<span className="text-[9px] text-low-emphasis">{tzLabel}</span>
					</div>

					{!hasData && !lc && (
						<div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
							<div className="flex flex-col items-center gap-2">
								<span className="text-xs text-medium-emphasis">No chart data available</span>
								<span className="text-[10px] text-low-emphasis">Waiting for market data...</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
