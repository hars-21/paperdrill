import { useId, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandles } from "@/hooks/use-candles";
import { cn } from "@/lib/utils";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 300;
const CHART_PADDING_X = 8;
const CHART_PADDING_Y = 18;

export function MarketPulseChart({
	symbol,
	positive,
	className,
}: {
	symbol: string;
	positive: boolean;
	className?: string;
}) {
	const gradientId = useId().replaceAll(":", "");
	const { candles, loading, error } = useCandles(symbol, "1H");
	const chart = useMemo(() => {
		const closes = candles
			.slice(-72)
			.map((candle) => Number(candle.close))
			.filter(Number.isFinite);

		if (closes.length < 2) return null;
		const min = Math.min(...closes);
		const max = Math.max(...closes);
		const range = max - min;
		const drawableWidth = CHART_WIDTH - CHART_PADDING_X * 2;
		const drawableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
		const points = closes.map((close, index) => {
			const x = CHART_PADDING_X + (index / (closes.length - 1)) * drawableWidth;
			const y =
				range === 0
					? CHART_HEIGHT / 2
					: CHART_PADDING_Y + ((max - close) / range) * drawableHeight;
			return { x, y };
		});
		const line = points
			.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
			.join(" ");
		const first = points[0];
		const last = points[points.length - 1];
		if (!first || !last) return null;

		return {
			line,
			area: `${line} L${last.x.toFixed(2)},${CHART_HEIGHT} L${first.x.toFixed(2)},${CHART_HEIGHT} Z`,
			last,
		};
	}, [candles]);

	if (loading && !chart) {
		return <Skeleton className={cn("h-full min-h-64 w-full rounded-lg", className)} />;
	}

	if (!chart) {
		return (
			<div
				className={cn(
					"flex h-full min-h-64 items-center justify-center border-y border-dashed border-border/50 text-sm text-medium-emphasis",
					className,
				)}
			>
				{error ? "Price history is temporarily unavailable." : "Waiting for price history."}
			</div>
		);
	}

	const lineColor = positive ? "var(--green-text)" : "var(--red-text)";

	return (
		<div className={cn("relative h-full min-h-64 w-full", className)}>
			<svg
				role="img"
				aria-label={`${symbol.replace("_", "/")} price movement over the last 72 hours`}
				viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
				preserveAspectRatio="none"
				className="h-full w-full overflow-visible"
			>
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
						<stop offset="100%" stopColor={lineColor} stopOpacity="0" />
					</linearGradient>
				</defs>
				{[0.25, 0.5, 0.75].map((position) => (
					<line
						key={position}
						x1="0"
						x2={CHART_WIDTH}
						y1={CHART_HEIGHT * position}
						y2={CHART_HEIGHT * position}
						stroke="var(--chart-grid)"
						strokeWidth="1"
						vectorEffect="non-scaling-stroke"
					/>
				))}
				<path d={chart.area} fill={`url(#${gradientId})`} />
				<path
					d={chart.line}
					fill="none"
					stroke={lineColor}
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				<circle
					cx={chart.last.x}
					cy={chart.last.y}
					r="4"
					fill="var(--l1)"
					stroke={lineColor}
					strokeWidth="2.5"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</div>
	);
}
