import { useEffect, useRef, useState } from "react";
import type { Candle, OrderBook, Ticker } from "@/types";
import { type CandleInterval, useCandles } from "../../hooks/use-candles";
import { useMarket } from "@/context/MarketContext";
import { cn } from "@/lib/utils";
import { ChartToolbar } from "./chart-toolbar";
import { CHART_RANGES, type ChartRange } from "./chart-utils";
import { DepthChart } from "./depth-chart";
import { MarketInfo } from "./market-info";
import { PriceChart } from "./price-chart";
import { formatPrice } from "@/utils/format";
import { Button } from "../ui/button";

type ChartProps = {
	symbol: string;
	orderbook: OrderBook;
	ticker: Ticker | null;
};

type ChartTab = "chart" | "depth" | "info";

const TABS: { value: ChartTab; label: string }[] = [
	{ value: "chart", label: "Chart" },
	{ value: "depth", label: "Depth" },
	{ value: "info", label: "Market info" },
];

function Clock() {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className="hidden items-center gap-1 whitespace-nowrap text-sm text-medium-emphasis sm:flex">
			<span>
				{now.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false,
				})}
			</span>
			<span>({now.toLocaleTimeString([], { timeZoneName: "shortOffset" }).split(" ")[2]})</span>
		</div>
	);
}

export function Chart({ symbol, orderbook, ticker }: ChartProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const [tab, setTab] = useState<ChartTab>("chart");
	const [interval, setInterval] = useState<CandleInterval>("1H");
	const [range, setRange] = useState<ChartRange>("All");
	const [showVolume, setShowVolume] = useState(true);
	const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
	const [resetKey, setResetKey] = useState(0);
	const [goLiveKey, setGoLiveKey] = useState(0);
	const { candles, loading, error } = useCandles(symbol, interval);
	const market = useMarket(symbol);
	const candle = hoveredCandle ?? candles[candles.length - 1] ?? null;
	const candleUp = !candle || Number(candle.close) >= Number(candle.open);
	const marketName = market ? `${market.baseAsset}/${market.quoteAsset}` : symbol.replace("_", "/");

	useEffect(() => {
		setHoveredCandle(null);
	}, [symbol, interval]);

	const toggleFullscreen = () => {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => undefined);
			return;
		}
		panelRef.current?.requestFullscreen().catch(() => undefined);
	};

	const resetChart = () => {
		setRange("All");
		setResetKey((key) => key + 1);
	};

	return (
		<div ref={panelRef} className="flex h-full min-h-0 flex-col bg-card">
			<div className="flex h-11 shrink-0 items-center overflow-x-auto border-b border-border/40 px-2 sm:px-3">
				<div className="flex items-center gap-1">
					{TABS.map((item) => (
						<button
							key={item.value}
							type="button"
							onClick={() => setTab(item.value)}
							className={cn(
								"flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
								tab === item.value
									? "bg-muted text-high-emphasis"
									: "text-medium-emphasis hover:text-high-emphasis",
							)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			{tab === "chart" ? (
				<>
					<ChartToolbar
						interval={interval}
						showVolume={showVolume}
						onIntervalChange={setInterval}
						onToggleVolume={() => setShowVolume((visible) => !visible)}
						onGoLive={() => setGoLiveKey((key) => key + 1)}
						onReset={resetChart}
						onFullscreen={toggleFullscreen}
					/>

					<div className="relative min-h-0 flex-1 overflow-hidden">
						<div className="pointer-events-none absolute left-6 top-2 z-10 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-x-6 gap-y-0.5">
							<span className="font-medium text-medium-emphasis">
								{marketName} · {interval} · PaperDrill
							</span>
							{candle && (
								<div className="flex items-center gap-1 text-xs text-medium-emphasis bg-l1/20">
									<span>
										O{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.open)}
										</span>
									</span>
									<span>
										H{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.high)}
										</span>
									</span>
									<span>
										L{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.low)}
										</span>
									</span>
									<span>
										C{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.close)}
										</span>
									</span>
									<span>
										V{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.volume)}
										</span>
									</span>
								</div>
							)}
						</div>

						{loading && candles.length === 0 ? (
							<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
								Loading chart…
							</div>
						) : error && candles.length === 0 ? (
							<div className="flex h-full items-center justify-center text-sm text-red-text">
								{error}
							</div>
						) : candles.length === 0 ? (
							<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
								No candle data yet
							</div>
						) : (
							<PriceChart
								candles={candles}
								showVolume={showVolume}
								range={range}
								resetKey={resetKey}
								goLiveKey={goLiveKey}
								symbol={symbol}
								onHover={setHoveredCandle}
							/>
						)}
					</div>

					<div className="flex h-9 shrink-0 items-center justify-between gap-2 overflow-x-auto border-t border-border/40 px-2 sm:px-3">
						<div className="flex items-center gap-1 sm:gap-3">
							{CHART_RANGES.map((item) => (
								<Button
									key={item}
									type="button"
									variant="ghost"
									onClick={() => setRange(item)}
									className={cn(
										"rounded px-1.5 py-1 text-xs font-medium transition-colors",
										range === item
											? "text-chart-5 underline decoration-chart-5 underline-offset-4 hover:text-chart-5"
											: "text-medium-emphasis hover:text-high-emphasis",
									)}
								>
									{item}
								</Button>
							))}
						</div>
						<Clock />
					</div>
				</>
			) : tab === "depth" ? (
				<div className="min-h-0 flex-1">
					<DepthChart orderbook={orderbook} ticker={ticker} />
				</div>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto">
					<MarketInfo symbol={symbol} ticker={ticker} />
				</div>
			)}
		</div>
	);
}
