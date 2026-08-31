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
	type ISeriesApi,
} from "lightweight-charts";
import type { Candle } from "@/types";
import { useMarket } from "@/context/MarketContext";
import {
	useCandles,
	CANDLE_INTERVALS,
	type CandleInterval,
} from "@/hooks/use-candles";

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
	const [hasData, setHasData] = useState(false);
	const [interval, setInterval] = useState<CandleInterval>("1H");
	const [now, setNow] = useState(new Date());

	const market = useMarket(symbol);
	const base = market?.baseAsset ?? symbol.split("_")[0] ?? symbol;
	const quote = market?.quoteAsset ?? symbol.split("_")[1] ?? "USD";

	const csRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const vsRef = useRef<ISeriesApi<"Histogram"> | null>(null);
	const colorsRef = useRef(getChartColors());
	const priceLineRef = useRef<IPriceLine | null>(null);

	const { candles, lastCandle, hasData: hookHasData } = useCandles(symbol, interval);

	useEffect(() => {
		const t = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(t);
	}, []);

	useEffect(() => {
		setHasData(hookHasData);
	}, [hookHasData]);

	useEffect(() => {
		if (!containerRef.current) return;

		const colors = getChartColors();
		colorsRef.current = colors;
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

		csRef.current = cs;
		vsRef.current = vs;
		priceLineRef.current = null;

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

		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				const { width, height } = e.contentRect;
				if (width > 0 && height > 0) chart.applyOptions({ width, height });
			}
		});
		ro.observe(containerRef.current);

		return () => {
			ro.disconnect();
			chart.remove();
			csRef.current = null;
			vsRef.current = null;
			priceLineRef.current = null;
		};
	}, [symbol, interval]);

	useEffect(() => {
		const cs = csRef.current;
		const vs = vsRef.current;
		if (!cs || !vs) return;
		const colors = colorsRef.current;

		cs.setData(
			candles.map((c) => ({
				time: Math.floor(c.time / 1000) as Time,
				open: Number(c.open),
				high: Number(c.high),
				low: Number(c.low),
				close: Number(c.close),
			})),
		);
		vs.setData(
			candles.map((c) => ({
				time: Math.floor(c.time / 1000) as Time,
				value: Number(c.volume),
				color: Number(c.close) >= Number(c.open) ? colors.volumeUp : colors.volumeDown,
			})),
		);

		const last = candles[candles.length - 1];
		if (last) {
			const up = Number(last.close) >= Number(last.open);
			if (priceLineRef.current) {
				priceLineRef.current.applyOptions({
					price: Number(last.close),
					color: up ? colors.candleUp : colors.candleDown,
				});
			} else {
				priceLineRef.current = cs.createPriceLine({
					price: Number(last.close),
					color: up ? colors.candleUp : colors.candleDown,
					lineWidth: 1,
					lineStyle: LineStyle.Dotted,
					axisLabelVisible: true,
				});
			}
		} else if (priceLineRef.current) {
			cs.removePriceLine(priceLineRef.current);
			priceLineRef.current = null;
		}
	}, [candles]);

	const dc = hc || (lastCandle ?? null);
	const up = dc ? Number(dc.close ?? 0) >= Number(dc.open ?? 0) : true;
	const vc = up ? "text-green-text" : "text-red-text";
	const stats = computeMarketStats(candles);

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
						{base}/{quote}
					</span>
				</div>

				<div className="flex items-center bg-card border border-border/40 rounded-lg p-0.5 shrink-0">
					{CANDLE_INTERVALS.map((int) => (
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

					{!hasData && !lastCandle && (
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
