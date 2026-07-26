import { useEffect, useRef, useState } from "react";
import {
	createChart,
	CandlestickSeries,
	HistogramSeries,
	CrosshairMode,
	type Time,
	ColorType,
} from "lightweight-charts";
import { Button } from "../ui/button";
import type { Candle } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { toast } from "sonner";

interface ChartProps {
	symbol: string;
}

const INTERVALS = ["15M", "1H", "4H", "1D"];

function resolveThemeColor(varName: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function hexToRgba(hex: string, alpha: number): string {
	if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;
	const h = hex.replace("#", "");
	const r = parseInt(h.substring(0, 2), 16);
	const g = parseInt(h.substring(2, 4), 16);
	const b = parseInt(h.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getChartColors() {
	const success = resolveThemeColor("--success") || "#00C087";
	const destructive = resolveThemeColor("--destructive") || "#FF3B30";
	const mutedFg = resolveThemeColor("--muted-foreground") || "#8E8E93";
	const border = resolveThemeColor("--border") || "#1E1E24";

	return {
		textColor: mutedFg,
		gridColor: hexToRgba(border, 0.4),
		crosshairColor: resolveThemeColor("--chart-crosshair") || "#3E3E48",
		borderColor: border,
		candleUp: success,
		candleDown: destructive,
		volumeUp: resolveThemeColor("--chart-volume-up") || hexToRgba(success, 0.15),
		volumeDown: resolveThemeColor("--chart-volume-down") || hexToRgba(destructive, 0.15),
	};
}

export function Chart({ symbol }: ChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hoveredCandle, setHoveredCandle] = useState<Partial<Candle> | null>(null);
	const [latestCandle, setLatestCandle] = useState<Partial<Candle> | null>(null);
	const [hasData, setHasData] = useState(false);
	const [interval, setInterval] = useState("1H");
	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!containerRef.current) return;

		const initialWidth = containerRef.current.clientWidth || 600;
		const initialHeight = containerRef.current.clientHeight || 350;
		const colors = getChartColors();

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
			rightPriceScale: {
				borderColor: colors.borderColor,
				autoScale: true,
			},
			timeScale: {
				borderColor: colors.borderColor,
				timeVisible: true,
				secondsVisible: false,
				rightOffset: 12,
				barSpacing: 10,
				fixLeftEdge: true,
			},
			handleScroll: true,
			handleScale: true,
			width: initialWidth,
			height: initialHeight,
		});

		const candleSeries = chart.addSeries(CandlestickSeries, {
			upColor: colors.candleUp,
			downColor: colors.candleDown,
			borderDownColor: colors.candleDown,
			borderUpColor: colors.candleUp,
			wickDownColor: colors.candleDown,
			wickUpColor: colors.candleUp,
		});

		const volumeSeries = chart.addSeries(HistogramSeries, {
			priceFormat: { type: "volume" },
			priceScaleId: "",
		});

		chart.priceScale("").applyOptions({
			scaleMargins: { top: 0.8, bottom: 0 },
		});

		api
			.getCandles(symbol, interval)
			.then((res) => {
				const data = res?.data ?? [];
				if (data.length > 0) {
					const last = data[data.length - 1]!;
					setLatestCandle({ ...last, time: last.time });
					setHasData(true);

					candleSeries.setData(
						data.map((c) => ({
							time: Math.floor(new Date(c.time).getTime() / 1000) as Time,
							open: Number(c.open),
							high: Number(c.high),
							low: Number(c.low),
							close: Number(c.close),
						})),
					);
					volumeSeries.setData(
						data.map((c) => ({
							time: Math.floor(new Date(c.time).getTime() / 1000) as Time,
							value: Number(c.volume),
							color:
								Number(c.close) >= Number(c.open)
									? colors.volumeUp
									: colors.volumeDown,
						})),
					);
				}
			})
			.catch((err) => {
				console.error("Failed to load candles:", err);
				toast.error("Failed to load chart data");
			});

		chart.subscribeCrosshairMove((param) => {
			if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
				setHoveredCandle(null);
				return;
			}

			const candleData = param.seriesData.get(candleSeries) as { open?: string | number; high?: string | number; low?: string | number; close?: string | number } | undefined;
			const volumeData = param.seriesData.get(volumeSeries) as { value?: string | number } | undefined;

			if (candleData) {
				setHoveredCandle({
					open: String(candleData.open ?? ""),
					high: String(candleData.high ?? ""),
					low: String(candleData.low ?? ""),
					close: String(candleData.close ?? ""),
					volume: String(volumeData?.value ?? 0),
				});
			} else {
				setHoveredCandle(null);
			}
		});

		const unsub = wsManager.subscribe(`candle:${symbol}`, (raw: unknown) => {
			if (!raw) return;
			const candle = raw as Candle;
			if (!candle.time || candle.open === undefined || candle.close === undefined) return;

			setLatestCandle(candle);

			const time = Math.floor(new Date(candle.time).getTime() / 1000) as Time;

			candleSeries.update({
				time,
				open: Number(candle.open),
				high: Number(candle.high),
				low: Number(candle.low),
				close: Number(candle.close),
			});

			volumeSeries.update({
				time,
				value: Number(candle.volume),
				color:
					Number(candle.close) >= Number(candle.open)
						? colors.volumeUp
						: colors.volumeDown,
			});
		});

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					chart.resize(width, height);
				}
			}
		});
		observer.observe(containerRef.current);

		return () => {
			unsub();
			observer.disconnect();
			chart.remove();
		};
	}, [symbol, interval]);

	const displayCandle = hoveredCandle || latestCandle;
	const isUp = displayCandle
		? Number(displayCandle.close ?? 0) >= Number(displayCandle.open ?? 0)
		: true;
	const valueColor = isUp ? "text-green-text" : "text-red-text";

	const formatPrice = (p?: string | number) =>
		p !== undefined ? String(Number(p).toFixed(2)) : "—";
	const formatVol = (v?: string | number) => {
		if (v === undefined) return "—";
		const n = Number(v);
		if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
		if (n >= 1000) return (n / 1000).toFixed(2) + "K";
		return n.toFixed(2);
	};

	return (
		<div className="relative w-full h-full flex flex-col bg-transparent p-3 pl-5 pr-3 pb-3">
			<div className="relative flex-1 w-full h-full min-h-75 z-0">
				<div className="absolute top-3 left-3 z-10 flex flex-col gap-2.5 pointer-events-none select-none">
					<div className="flex items-center gap-3 pointer-events-auto">
						<div className="flex items-center bg-card border border-border/40 rounded-lg p-0.5">
							{INTERVALS.map((int) => (
								<Button
									key={int}
									onClick={() => setInterval(int)}
									variant="ghost"
									className={`px-2.5 py-1 text-[10px] font-medium rounded-md ${
										interval === int
											? "bg-muted text-high-emphasis"
											: "text-medium-emphasis hover:text-high-emphasis hover:bg-muted/50"
									}`}
								>
									{int}
								</Button>
							))}
						</div>

						<div className="flex items-center gap-2 bg-card border border-border/40 rounded-lg px-2.5 py-1">
							<span className="w-1.5 h-1.5 rounded-full bg-success" />
							<span className="text-[10px] font-medium text-medium-emphasis">
								{currentTime.toLocaleTimeString([], { hour12: false })}
							</span>
						</div>
					</div>

					{displayCandle && (
						<div className="flex items-center gap-3.5 text-xs px-1">
							<span className="text-medium-emphasis">
								O <span className={valueColor}>{formatPrice(displayCandle.open)}</span>
							</span>
							<span className="text-medium-emphasis">
								H <span className={valueColor}>{formatPrice(displayCandle.high)}</span>
							</span>
							<span className="text-medium-emphasis">
								L <span className={valueColor}>{formatPrice(displayCandle.low)}</span>
							</span>
							<span className="text-medium-emphasis">
								C <span className={valueColor}>{formatPrice(displayCandle.close)}</span>
							</span>
							<span className="text-medium-emphasis">
								V <span className="text-high-emphasis">{formatVol(displayCandle.volume)}</span>
							</span>
						</div>
					)}
				</div>

				{!hasData && !latestCandle && (
					<div className="absolute inset-0 flex items-center justify-center z-10">
						<div className="flex flex-col items-center gap-2 select-none">
							<span className="text-xs text-medium-emphasis">No chart data available</span>
							<span className="text-[10px] text-low-emphasis">Waiting for market data...</span>
						</div>
					</div>
				)}

				<div ref={containerRef} className="w-full h-full" />
			</div>
		</div>
	);
}
