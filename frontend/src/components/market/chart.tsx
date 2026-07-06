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

interface ChartProps {
	symbol: string;
}

const INTERVALS = ["15M", "1H", "4H", "1D"];

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

		const chart = createChart(containerRef.current, {
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: "#8E8E93",
			},
			grid: {
				vertLines: { color: "rgba(30, 30, 36, 0.4)", style: 1 },
				horzLines: { color: "rgba(30, 30, 36, 0.4)", style: 1 },
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: { width: 1, color: "#3E3E48", style: 3 },
				horzLine: { width: 1, color: "#3E3E48", style: 3 },
			},
			rightPriceScale: {
				borderColor: "#1E1E24",
				autoScale: true,
			},
			timeScale: {
				borderColor: "#1E1E24",
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
			upColor: "#00C087",
			downColor: "#FF3B30",
			borderDownColor: "#FF3B30",
			borderUpColor: "#00C087",
			wickDownColor: "#FF3B30",
			wickUpColor: "#00C087",
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
									? "rgba(0, 192, 135, 0.15)"
									: "rgba(255, 59, 48, 0.15)",
						})),
					);
				}
			})
			.catch((err) => {
				console.error("Failed to load candles:", err);
			});

		chart.subscribeCrosshairMove((param) => {
			if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
				setHoveredCandle(null);
				return;
			}

			const candleData = param.seriesData.get(candleSeries) as any;
			const volumeData = param.seriesData.get(volumeSeries) as any;

			if (candleData) {
				setHoveredCandle({
					open: candleData.open,
					high: candleData.high,
					low: candleData.low,
					close: candleData.close,
					volume: volumeData ? volumeData.value : 0,
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
						? "rgba(0, 192, 135, 0.15)"
						: "rgba(255, 59, 48, 0.15)",
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
	const valueColor = isUp ? "text-success" : "text-destructive";

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
						<div className="flex items-center bg-card/60 backdrop-blur-md border border-border/30 rounded-md p-0.5 shadow-sm">
							{INTERVALS.map((int) => (
								<Button
									key={int}
									onClick={() => setInterval(int)}
									variant="ghost"
									className={`px-2.5 py-1 text-[10px] font-semibold rounded-sm ${
										interval === int
											? "bg-muted text-high-emphasis shadow-sm"
											: "text-muted-foreground hover:text-high-emphasis hover:bg-muted/50"
									}`}
								>
									{int}
								</Button>
							))}
						</div>

						<div className="flex items-center gap-2 bg-card/60 backdrop-blur-md border border-border/30 rounded-md px-2.5 py-1 shadow-sm">
							<span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(0,192,135,0.6)]" />
							<span className="text-[10px] font-mono font-medium text-muted-foreground tracking-wide">
								{currentTime.toLocaleTimeString([], { hour12: false })}
							</span>
						</div>
					</div>

					{displayCandle && (
						<div className="flex items-center gap-3.5 text-xs font-mono px-1">
							<span className="text-muted-foreground">
								O <span className={valueColor}>{formatPrice(displayCandle.open)}</span>
							</span>
							<span className="text-muted-foreground">
								H <span className={valueColor}>{formatPrice(displayCandle.high)}</span>
							</span>
							<span className="text-muted-foreground">
								L <span className={valueColor}>{formatPrice(displayCandle.low)}</span>
							</span>
							<span className="text-muted-foreground">
								C <span className={valueColor}>{formatPrice(displayCandle.close)}</span>
							</span>
							<span className="text-muted-foreground">
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

				<div className="absolute left-0 top-0 bottom-6 w-px bg-[#1E1E24]" />
			</div>
		</div>
	);
}
