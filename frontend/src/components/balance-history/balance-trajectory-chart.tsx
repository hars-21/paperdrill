import { useId, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BalanceSeriesResponse } from "@/types";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 300;
const PADDING_X = 8;
const PADDING_Y = 20;

function axisLabel(value: number, precision: number) {
	return value.toLocaleString(undefined, {
		maximumFractionDigits: precision > 2 ? 4 : 2,
	});
}

export function BalanceTrajectoryChart({
	series,
	loading,
	error,
	className,
}: {
	series: BalanceSeriesResponse | null;
	loading?: boolean;
	error?: Error | null;
	className?: string;
}) {
	const availableGradientId = useId().replaceAll(":", "");
	const lockedGradientId = useId().replaceAll(":", "");

	const chart = useMemo(() => {
		const points = (series?.points ?? [])
			.map((point) => ({
				available: Number(point.available),
				locked: Number(point.locked),
				total: Number(point.total),
			}))
			.filter(
				(point) =>
					Number.isFinite(point.available) &&
					Number.isFinite(point.locked) &&
					Number.isFinite(point.total),
			);

		if (points.length === 0) return null;

		const max = Math.max(...points.map((point) => point.total), 0);
		const top = max > 0 ? max : 1;
		const drawableWidth = CHART_WIDTH - PADDING_X * 2;
		const drawableHeight = CHART_HEIGHT - PADDING_Y * 2;
		const xFor = (index: number) =>
			points.length === 1
				? PADDING_X
				: PADDING_X + (index / (points.length - 1)) * drawableWidth;
		const yFor = (value: number) =>
			PADDING_Y + ((top - value) / top) * drawableHeight;

		const availablePoints = points.map((point, index) => ({
			x: xFor(index),
			y: yFor(point.available),
		}));
		const totalPoints = points.map((point, index) => ({
			x: xFor(index),
			y: yFor(point.total),
		}));

		if (points.length === 1) {
			const only = availablePoints[0];
			const onlyTotal = totalPoints[0];
			if (!only || !onlyTotal) return null;
			availablePoints.push({ x: CHART_WIDTH - PADDING_X, y: only.y });
			totalPoints.push({ x: CHART_WIDTH - PADDING_X, y: onlyTotal.y });
		}

		const line = (items: { x: number; y: number }[]) =>
			items
				.map(
					(point, index) =>
						`${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
				)
				.join(" ");

		const firstAvailable = availablePoints[0];
		const lastAvailable = availablePoints[availablePoints.length - 1];
		const firstTotal = totalPoints[0];
		const lastTotal = totalPoints[totalPoints.length - 1];
		if (!firstAvailable || !lastAvailable || !firstTotal || !lastTotal) return null;

		const availableArea = `${line(availablePoints)} L${lastAvailable.x.toFixed(2)},${CHART_HEIGHT} L${firstAvailable.x.toFixed(2)},${CHART_HEIGHT} Z`;
		const lockedArea = `${line(totalPoints)} ${[...availablePoints]
			.reverse()
			.map((point) => `L${point.x.toFixed(2)},${point.y.toFixed(2)}`)
			.join(" ")} Z`;

		return {
			availableArea,
			lockedArea,
			totalLine: line(totalPoints),
			availableLine: line(availablePoints),
			lastTotal,
			max,
			top,
		};
	}, [series]);

	if (loading && !chart) {
		return <Skeleton className={cn("h-64 w-full rounded-lg", className)} />;
	}

	if (!chart) {
		return (
			<div
				className={cn(
					"flex h-64 items-center justify-center rounded-lg border border-dashed border-border/50 px-6 text-center text-sm text-medium-emphasis",
					className,
				)}
			>
				{error
					? "Balance history is temporarily unavailable."
					: "Balance changes will appear here after your first credit or trade."}
			</div>
		);
	}

	const precision = series?.precision ?? 2;

	return (
		<div className={cn("relative h-64 w-full", className)}>
			<svg
				role="img"
				aria-label={`Balance trajectory for ${series?.unit ?? "your account"} over the selected range`}
				viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
				preserveAspectRatio="none"
				className="h-full w-full overflow-visible"
			>
				<defs>
					<linearGradient id={availableGradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--green-text)" stopOpacity="0.35" />
						<stop offset="100%" stopColor="var(--green-text)" stopOpacity="0.05" />
					</linearGradient>
					<linearGradient id={lockedGradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--chart-5)" stopOpacity="0.35" />
						<stop offset="100%" stopColor="var(--chart-5)" stopOpacity="0.08" />
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

				<path d={chart.availableArea} fill={`url(#${availableGradientId})`} />
				<path d={chart.lockedArea} fill={`url(#${lockedGradientId})`} />
				<path
					d={chart.availableLine}
					fill="none"
					stroke="var(--green-text)"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={chart.totalLine}
					fill="none"
					stroke="var(--chart-5)"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
				<circle
					cx={chart.lastTotal.x}
					cy={chart.lastTotal.y}
					r="4"
					fill="var(--l1)"
					stroke="var(--chart-5)"
					strokeWidth="2.5"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>

			<div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-1 text-[10px] text-low-emphasis tabular-nums">
				<span>{axisLabel(chart.top, precision)}</span>
				<span>{axisLabel(chart.top / 2, precision)}</span>
				<span>0</span>
			</div>
		</div>
	);
}
