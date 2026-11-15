import { useId, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PortfolioHistoryResponse } from "@/types";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 280;
const PADDING_X = 8;
const PADDING_Y = 18;

function axisLabel(value: number) {
	return value.toLocaleString(undefined, {
		maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
	});
}

function dateLabel(value: string) {
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return "";

	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PortfolioEquityChart({
	history,
	loading,
	error,
	className,
}: {
	history: PortfolioHistoryResponse | null;
	loading?: boolean;
	error?: Error | null;
	className?: string;
}) {
	const gradientId = useId().replaceAll(":", "");

	const chart = useMemo(() => {
		const points = (history?.points ?? [])
			.map((point) => ({
				at: new Date(point.at).getTime(),
				equity: Number(point.equity),
				netContributions: Number(point.netContributions),
			}))
			.filter(
				(point) =>
					Number.isFinite(point.at) &&
					Number.isFinite(point.equity) &&
					Number.isFinite(point.netContributions),
			);

		if (points.length === 0) return null;

		const values = points.flatMap((point) => [point.equity, point.netContributions]);
		const rawMin = Math.min(...values);
		const rawMax = Math.max(...values);
		const span = rawMax - rawMin;
		const pad = span > 0 ? span * 0.12 : Math.max(1, Math.abs(rawMax) * 0.02 || 1);
		const top = rawMax + pad;
		const bottom = rawMin - pad;

		const drawableWidth = CHART_WIDTH - PADDING_X * 2;
		const drawableHeight = CHART_HEIGHT - PADDING_Y * 2;
		const firstAt = points[0]!.at;
		const lastAt = points[points.length - 1]!.at;
		const timeSpan = Math.max(1, lastAt - firstAt);

		const xFor = (at: number) =>
			points.length === 1
				? PADDING_X
				: PADDING_X + ((at - firstAt) / timeSpan) * drawableWidth;
		const yFor = (value: number) =>
			PADDING_Y + ((top - value) / Math.max(1, top - bottom)) * drawableHeight;

		const priced = points.map((point) => ({
			x: xFor(point.at),
			equity: yFor(point.equity),
			netContributions: yFor(point.netContributions),
		}));

		if (priced.length === 1) {
			const only = priced[0]!;
			priced.push({
				x: CHART_WIDTH - PADDING_X,
				equity: only.equity,
				netContributions: only.netContributions,
			});
		}

		const line = (items: { x: number; value: number }[]) =>
			items
				.map(
					(point, index) =>
						`${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.value.toFixed(2)}`,
				)
				.join(" ");

		const equityPoints = priced.map((point) => ({ x: point.x, value: point.equity }));
		const baselinePoints = priced.map((point) => ({
			x: point.x,
			value: point.netContributions,
		}));
		const first = equityPoints[0]!;
		const last = equityPoints[equityPoints.length - 1]!;
		const lastPoint = points[points.length - 1]!;
		const firstPoint = points[0]!;

		return {
			line: line(equityPoints),
			baseline: baselinePoints.length > 1 ? line(baselinePoints) : null,
			area: `${line(equityPoints)} L${last.x.toFixed(2)},${CHART_HEIGHT} L${first.x.toFixed(2)},${CHART_HEIGHT} Z`,
			last,
			top,
			bottom,
			mid: (top + bottom) / 2,
			firstAt: firstPoint.at,
			lastAt: lastPoint.at,
			up: lastPoint.equity >= firstPoint.equity,
			lastEquity: lastPoint.equity,
		};
	}, [history]);

	if (loading && !chart) {
		return <Skeleton className={cn("h-72 w-full rounded-lg", className)} />;
	}

	if (!chart) {
		return (
			<div
				className={cn(
					"flex h-72 items-center justify-center rounded-lg border border-dashed border-border/50 px-6 text-center text-sm text-medium-emphasis",
					className,
				)}
			>
				{error
					? "Portfolio history is temporarily unavailable."
					: "Your equity curve will appear after the first snapshot is recorded."}
			</div>
		);
	}

	const stroke = chart.up ? "var(--green-text)" : "var(--red-text)";

	return (
		<div className={cn("w-full", className)}>
			<div className="relative h-72 w-full">
				<svg
					role="img"
					aria-label={`Portfolio equity over the selected range, ending at ${axisLabel(chart.lastEquity)}`}
					viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
					preserveAspectRatio="none"
					className="h-full w-full overflow-visible"
				>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
							<stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
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
					{chart.baseline ? (
						<path
							d={chart.baseline}
							fill="none"
							stroke="var(--low-emphasis)"
							strokeWidth="1.5"
							strokeDasharray="5 6"
							vectorEffect="non-scaling-stroke"
						/>
					) : null}
					<path
						d={chart.line}
						fill="none"
						stroke={stroke}
						strokeWidth="2.25"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<circle
						cx={chart.last.x}
						cy={chart.last.value}
						r="4"
						fill="var(--l1)"
						stroke={stroke}
						strokeWidth="2.5"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				<div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-1 text-[10px] text-low-emphasis tabular-nums">
					<span>{axisLabel(chart.top)}</span>
					<span>{axisLabel(chart.mid)}</span>
					<span>{axisLabel(chart.bottom)}</span>
				</div>
			</div>

			<div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-low-emphasis tabular-nums">
				<span>{dateLabel(history?.from ?? new Date(chart.firstAt).toISOString())}</span>
				<span className="flex items-center gap-4">
					<span className="inline-flex items-center gap-1.5">
						<span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: stroke }} />
						Equity
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="h-0 w-4 border-t border-dashed border-low-emphasis" />
						Net contributions
					</span>
				</span>
				<span>{dateLabel(history?.to ?? new Date(chart.lastAt).toISOString())}</span>
			</div>
		</div>
	);
}
