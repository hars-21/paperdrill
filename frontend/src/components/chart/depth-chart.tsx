import { useMemo } from "react";
import type { OrderBook, Ticker } from "@/types";
import { formatPrice, formatQty } from "@/utils/format";

type DepthPoint = { price: number; cumulative: number };

function cumulativeLevels(levels: [number, number][], side: "bid" | "ask") {
	const sorted = [...levels].sort((a, b) => (side === "bid" ? b[0] - a[0] : a[0] - b[0]));
	let cumulative = 0;
	const points = sorted.map(([price, qty]) => {
		cumulative += qty;
		return { price, cumulative };
	});
	return side === "bid" ? points.reverse() : points;
}

function stepPath(
	points: DepthPoint[],
	xScale: (price: number) => number,
	yScale: (quantity: number) => number,
	baseY: number,
) {
	const first = points[0];
	if (!first) return "";
	let path = `M ${xScale(first.price)} ${baseY} L ${xScale(first.price)} ${yScale(first.cumulative)}`;
	for (let index = 1; index < points.length; index++) {
		const previous = points[index - 1];
		const point = points[index];
		if (!previous || !point) continue;
		path += ` L ${xScale(point.price)} ${yScale(previous.cumulative)} L ${xScale(point.price)} ${yScale(point.cumulative)}`;
	}
	const last = points[points.length - 1];
	return last ? `${path} L ${xScale(last.price)} ${baseY} Z` : path;
}

function numericLevels(levels: Record<string, string>) {
	return Object.entries(levels)
		.map(([price, quantity]) => [Number(price), Number(quantity)] as [number, number])
		.filter(
			([price, quantity]) => Number.isFinite(price) && Number.isFinite(quantity) && quantity > 0,
		);
}

const width = 1000;
const height = 360;
const padding = 32;

export function DepthChart({ orderbook, ticker }: { orderbook: OrderBook; ticker: Ticker | null }) {
	const bidPoints = useMemo(
		() => cumulativeLevels(numericLevels(orderbook.bids), "bid"),
		[orderbook.bids],
	);
	const askPoints = useMemo(
		() => cumulativeLevels(numericLevels(orderbook.asks), "ask"),
		[orderbook.asks],
	);

	if (bidPoints.length === 0 && askPoints.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				No depth available
			</div>
		);
	}

	const minPrice = bidPoints[0]?.price ?? askPoints[0]?.price ?? 0;
	const maxPrice =
		askPoints[askPoints.length - 1]?.price ?? bidPoints[bidPoints.length - 1]?.price ?? minPrice;
	const maxBidDepth = Math.max(...bidPoints.map((point) => point.cumulative), 0);
	const maxAskDepth = Math.max(...askPoints.map((point) => point.cumulative), 0);
	const maxCumulative = Math.max(maxBidDepth, maxAskDepth, 1);
	const bestBid = bidPoints[bidPoints.length - 1]?.price;
	const bestAsk = askPoints[0]?.price;
	const midPrice =
		bestBid !== undefined && bestAsk !== undefined
			? (bestBid + bestAsk) / 2
			: Number(ticker?.lastPrice);
	const priceRange = maxPrice - minPrice;
	const xScale = (price: number) =>
		priceRange === 0
			? width / 2
			: padding + ((price - minPrice) / priceRange) * (width - padding * 2);
	const yScale = (quantity: number) =>
		height - padding - (quantity / maxCumulative) * (height - padding * 2);
	const baseY = yScale(0);
	const midPosition = Number.isFinite(midPrice) ? `${(xScale(midPrice) / width) * 100}%` : "50%";
	const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : null;

	return (
		<div className="relative h-full min-h-64 w-full overflow-hidden p-3">
			<div className="absolute left-3 top-3 z-10 flex items-center gap-5 text-xs">
				<span className="text-medium-emphasis">
					Mid <span className="text-high-emphasis">{formatPrice(midPrice)}</span>
				</span>
				{spread !== null && (
					<span className="text-medium-emphasis">
						Spread <span className="text-high-emphasis">{formatPrice(spread)}</span>
					</span>
				)}
			</div>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				preserveAspectRatio="none"
				className="h-full w-full pt-7"
				aria-label="Cumulative market depth chart"
			>
				{[0.25, 0.5, 0.75].map((ratio) => (
					<line
						key={ratio}
						x1={padding}
						y1={yScale(maxCumulative * ratio)}
						x2={width - padding}
						y2={yScale(maxCumulative * ratio)}
						stroke="var(--chart-grid)"
						strokeDasharray="3 4"
						vectorEffect="non-scaling-stroke"
					/>
				))}
				<path
					d={stepPath(bidPoints, xScale, yScale, baseY)}
					fill="var(--green-bg)"
					stroke="var(--green-text)"
					strokeWidth="1.5"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={stepPath(askPoints, xScale, yScale, baseY)}
					fill="var(--red-bg)"
					stroke="var(--red-text)"
					strokeWidth="1.5"
					vectorEffect="non-scaling-stroke"
				/>
				{Number.isFinite(midPrice) && (
					<line
						x1={xScale(midPrice)}
						y1={padding}
						x2={xScale(midPrice)}
						y2={baseY}
						stroke="var(--chart-crosshair)"
						strokeDasharray="4 4"
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</svg>
			<div className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-muted-foreground">
				{formatPrice(minPrice)}
			</div>
			<div className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-muted-foreground">
				{formatPrice(maxPrice)}
			</div>
			<div
				className="pointer-events-none absolute bottom-3 -translate-x-1/2 text-[11px] text-high-emphasis"
				style={{ left: midPosition }}
			>
				{formatPrice(midPrice)}
			</div>
			<div className="pointer-events-none absolute bottom-8 left-4 text-[11px] text-green-text">
				Bid depth {formatQty(maxBidDepth, 2)}
			</div>
			<div className="pointer-events-none absolute bottom-8 right-4 text-[11px] text-red-text">
				Ask depth {formatQty(maxAskDepth, 2)}
			</div>
		</div>
	);
}
