import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandles } from "@/hooks/use-candles";
import { cn } from "@/lib/utils";

interface MarketLineChartProps {
	symbol: string;
	positive: boolean;
	className?: string;
}

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 280;
const CHART_PADDING = 12;

export function MarketLineChart({ symbol, positive, className }: MarketLineChartProps) {
	const { candles, loading, error } = useCandles(symbol, "1H");
	const points = useMemo(() => {
		const closes = candles
			.slice(-64)
			.map((candle) => Number(candle.close))
			.filter(Number.isFinite);

		if (closes.length < 2) return "";

		const min = Math.min(...closes);
		const max = Math.max(...closes);
		const range = max - min;
		const drawableHeight = CHART_HEIGHT - CHART_PADDING * 2;

		return closes
			.map((close, index) => {
				const x = (index / (closes.length - 1)) * CHART_WIDTH;
				const y = range === 0
					? CHART_HEIGHT / 2
					: CHART_PADDING + ((max - close) / range) * drawableHeight;
				return `${x.toFixed(2)},${y.toFixed(2)}`;
			})
			.join(" ");
	}, [candles]);

	if (loading) {
		return <Skeleton className={cn("h-full min-h-28 w-full rounded-lg", className)} />;
	}

	if (error || !points) {
		return (
			<div
				className={cn(
					"flex h-full min-h-28 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-low-emphasis",
					className,
				)}
			>
				{error ? "Chart unavailable" : "Waiting for price history"}
			</div>
		);
	}

	return (
		<div className={cn("relative h-full min-h-28 w-full", className)}>
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/40"
			/>
			<svg
				role="img"
				aria-label={`${symbol} price chart for the last 64 hours`}
				viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
				preserveAspectRatio="none"
				className="relative h-full w-full overflow-visible"
			>
				<polyline
					points={points}
					fill="none"
					stroke={positive ? "var(--green-text)" : "var(--red-text)"}
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</div>
	);
}
