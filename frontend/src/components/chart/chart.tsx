import { Activity, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Candle, OrderBook, Ticker } from "@/types";
import { type CandleInterval, useCandles } from "../../hooks/use-candles";
import { useMarket } from "@/context/MarketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getChartPreferences, saveChartPreferences } from "@/lib/ux-preferences";
import { cn } from "@/lib/utils";
import { ChartToolbar } from "./chart-toolbar";
import { CHART_RANGES, type ChartRange, type ChartStyle } from "./chart-utils";
import { DepthChart } from "./depth-chart";
import { MarketInfo } from "./market-info";
import { PriceChart } from "./price-chart";
import { formatPrice } from "@/utils/format";
import { Button } from "../ui/button";

type ChartProps = {
	symbol: string;
	orderbook: OrderBook;
	ticker: Ticker | null;
	mobileOrderbook?: ReactNode;
	mobileTrades?: ReactNode;
};

type ChartTab = "chart" | "depth" | "book" | "trades" | "info";

const DESKTOP_TABS: { value: ChartTab; label: string }[] = [
	{ value: "chart", label: "Chart" },
	{ value: "depth", label: "Depth" },
	{ value: "info", label: "Market info" },
];

const MOBILE_TABS: { value: ChartTab; label: string }[] = [
	{ value: "chart", label: "Chart" },
	{ value: "book", label: "Book" },
	{ value: "trades", label: "Trades" },
	{ value: "info", label: "Info" },
];

const clockFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
});

const timeZoneFormatter = new Intl.DateTimeFormat(undefined, {
	timeZoneName: "short",
});

function formatTimeZone(date: Date) {
	const timeZoneName = timeZoneFormatter
		.formatToParts(date)
		.find((part) => part.type === "timeZoneName")?.value;
	if (timeZoneName) return timeZoneName;

	return Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll("_", " ");
}

function Clock() {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className="hidden items-center gap-1 whitespace-nowrap text-sm text-medium-emphasis sm:flex">
			<time dateTime={now.toISOString()}>{clockFormatter.format(now)}</time>
			<span>({formatTimeZone(now)})</span>
		</div>
	);
}

export function Chart({ symbol, orderbook, ticker, mobileOrderbook, mobileTrades }: ChartProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();
	const [tab, setTab] = useState<ChartTab>("chart");
	const [interval, setInterval] = useState<CandleInterval>(
		() => getChartPreferences().interval,
	);
	const [chartStyle, setChartStyle] = useState<ChartStyle>(
		() => getChartPreferences().style,
	);
	const [range, setRange] = useState<ChartRange>("All");
	const [showVolume, setShowVolume] = useState(() => getChartPreferences().showVolume);
	const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
	const [resetKey, setResetKey] = useState(0);
	const [goLiveKey, setGoLiveKey] = useState(0);
	const { candles, loading, error } = useCandles(symbol, interval);
	const market = useMarket(symbol);
	const candle = hoveredCandle ?? candles[candles.length - 1] ?? null;
	const candleUp = !candle || Number(candle.close) >= Number(candle.open);
	const marketName = market ? `${market.baseAsset}/${market.quoteAsset}` : symbol.replace("_", "/");
	const tabs = isMobile ? MOBILE_TABS : DESKTOP_TABS;

	useEffect(() => {
		setHoveredCandle(null);
	}, [symbol, interval]);

	useEffect(() => {
		if (!tabs.some((item) => item.value === tab)) setTab("chart");
	}, [tab, tabs]);

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

	const handleIntervalChange = (nextInterval: CandleInterval) => {
		setInterval(nextInterval);
		saveChartPreferences({ interval: nextInterval });
	};

	const handleChartStyleChange = (nextStyle: ChartStyle) => {
		setChartStyle(nextStyle);
		saveChartPreferences({ style: nextStyle });
	};

	const toggleVolume = () => {
		setShowVolume((visible) => {
			const nextVisible = !visible;
			saveChartPreferences({ showVolume: nextVisible });
			return nextVisible;
		});
	};

	const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		let nextIndex = index;
		if (event.key === "Home") nextIndex = 0;
		else if (event.key === "End") nextIndex = tabs.length - 1;
		else if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
		else nextIndex = (index - 1 + tabs.length) % tabs.length;
		const nextTab = tabs[nextIndex];
		if (!nextTab) return;
		setTab(nextTab.value);
		document.getElementById(`chart-${nextTab.value}-tab`)?.focus();
	};

	return (
		<div ref={panelRef} className="flex h-full min-h-0 flex-col bg-l1">
			<div className="no-scrollbar flex h-11 shrink-0 items-center overflow-x-auto border-b border-border/40 px-2 sm:px-3">
				<div className="flex items-center gap-1" role="tablist" aria-label="Market chart views">
					{tabs.map((item, index) => (
						<button
							key={item.value}
							id={`chart-${item.value}-tab`}
							type="button"
							role="tab"
							aria-selected={tab === item.value}
							aria-controls="chart-view-panel"
							tabIndex={tab === item.value ? 0 : -1}
							onClick={() => setTab(item.value)}
							onKeyDown={(event) => handleTabKeyDown(event, index)}
							className={cn(
								"flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
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
						chartStyle={chartStyle}
						showVolume={showVolume}
						onIntervalChange={handleIntervalChange}
						onChartStyleChange={handleChartStyleChange}
						onToggleVolume={toggleVolume}
						onGoLive={() => setGoLiveKey((key) => key + 1)}
						onReset={resetChart}
						onFullscreen={toggleFullscreen}
					/>

					<div
						id="chart-view-panel"
						role="tabpanel"
						aria-labelledby="chart-chart-tab"
						className="relative min-h-0 flex-1 overflow-hidden"
					>
						<div className="pointer-events-none absolute top-2 left-3 z-10 flex max-w-[calc(100%-4rem)] flex-wrap items-center gap-x-3 gap-y-0.5 sm:left-6 sm:gap-x-6">
							<span className="font-medium text-medium-emphasis">
								{marketName} · {interval}<span className="hidden sm:inline"> · PaperDrill</span>
							</span>
							{candle && (
								<div className="flex items-center gap-1 text-xs text-medium-emphasis">
									<span>
										O{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.open)}
										</span>
									</span>
									<span className="hidden sm:inline">
										H{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.high)}
										</span>
									</span>
									<span className="hidden sm:inline">
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
									<span className="hidden sm:inline">
										V{" "}
										<span className={candleUp ? "text-green-text" : "text-red-text"}>
											{formatPrice(candle.volume)}
										</span>
									</span>
								</div>
							)}
						</div>

						{loading && candles.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
								<div className="size-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
								Loading chart…
							</div>
						) : error && candles.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
								<div className="flex size-9 items-center justify-center rounded-full bg-secondary text-red-text">
									<CircleAlert className="size-4" />
								</div>
								<p className="text-sm font-medium text-high-emphasis">Could not load chart</p>
								<p className="max-w-sm text-xs text-medium-emphasis">{error}</p>
							</div>
						) : candles.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
								<div className="flex size-9 items-center justify-center rounded-full bg-secondary text-medium-emphasis">
									<Activity className="size-4" />
								</div>
								<p className="text-sm font-medium text-high-emphasis">No candle data yet</p>
								<p className="text-xs text-medium-emphasis">
									The chart will update after the first trade.
								</p>
							</div>
						) : (
							<PriceChart
								candles={candles}
								chartStyle={chartStyle}
								showVolume={showVolume}
								range={range}
								resetKey={resetKey}
								goLiveKey={goLiveKey}
								symbol={symbol}
								onHover={setHoveredCandle}
							/>
						)}
					</div>

					<div className="no-scrollbar flex h-9 shrink-0 items-center justify-between gap-2 overflow-x-auto border-t border-border/40 px-2 sm:px-3">
						<div className="flex items-center gap-1 sm:gap-3">
							{CHART_RANGES.map((item) => (
								<Button
									key={item}
									type="button"
									variant="ghost"
									onClick={() => setRange(item)}
									className={cn(
										"rounded px-1.5 py-1 text-xs font-medium transition-colors",
										(item === "3M" || item === "1M") && "hidden sm:inline-flex",
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
				<div
					id="chart-view-panel"
					role="tabpanel"
					aria-labelledby="chart-depth-tab"
					className="min-h-0 flex-1"
				>
					<DepthChart orderbook={orderbook} ticker={ticker} />
				</div>
			) : tab === "book" ? (
				<div
					id="chart-view-panel"
					role="tabpanel"
					aria-labelledby="chart-book-tab"
					className="min-h-0 flex-1"
				>
					{mobileOrderbook}
				</div>
			) : tab === "trades" ? (
				<div
					id="chart-view-panel"
					role="tabpanel"
					aria-labelledby="chart-trades-tab"
					className="min-h-0 flex-1"
				>
					{mobileTrades}
				</div>
			) : (
				<div
					id="chart-view-panel"
					role="tabpanel"
					aria-labelledby="chart-info-tab"
					className="min-h-0 flex-1 overflow-y-auto"
				>
					<MarketInfo symbol={symbol} ticker={ticker} />
				</div>
			)}
		</div>
	);
}
