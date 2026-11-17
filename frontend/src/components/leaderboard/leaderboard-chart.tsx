import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { LeaderboardHistoryPoint } from "@/types";

const SPARK_WIDTH = 160;
const SPARK_HEIGHT = 44;
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 240;
const PADDING_X = 4;
const PADDING_Y = 12;

interface Point {
	at: number;
	equity: number;
	netContributions: number;
}

function toPoints(history: LeaderboardHistoryPoint[]): Point[] {
	return history
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
}

function linePath(points: { x: number; y: number }[]) {
	return points
		.map(
			(point, index) =>
				`${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
		)
		.join(" ");
}

function compact(value: number) {
	return value.toLocaleString(undefined, {
		notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
		maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
	});
}

/**
 * Axis labels need enough precision to keep adjacent gridlines distinct when
 * the plotted span is small (for example a portfolio moving between 10,200 and
 * 10,216). Percent-scale spans keep more decimals; large spans go compact.
 */
function axisLabel(value: number, span: number) {
	if (!Number.isFinite(value)) return "-";

	const absSpan = Math.abs(span);
	if (absSpan >= 100_000) {
		return value.toLocaleString(undefined, {
			notation: "compact",
			maximumFractionDigits: 1,
		});
	}

	const digits = absSpan >= 100 ? 0 : absSpan >= 10 ? 1 : 2;
	return value.toLocaleString(undefined, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});
}

function dateLabel(value: number) {
	return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Performance sparkline: plots lifetime PnL (equity minus contributions) so a
 * deposit does not read as a gain.
 */
export function LeaderboardSparkline({
	history,
	className,
}: {
	history: LeaderboardHistoryPoint[];
	className?: string;
}) {
	const gradientId = useId().replaceAll(":", "");

	const chart = useMemo(() => {
		const points = toPoints(history).map((point) => ({
			at: point.at,
			value: point.equity - point.netContributions,
		}));

		if (points.length === 0) return null;

		const values = points.map((point) => point.value);
		const rawMin = Math.min(...values);
		const rawMax = Math.max(...values);
		const span = rawMax - rawMin;
		const pad = span > 0 ? span * 0.15 : Math.max(1, Math.abs(rawMax) * 0.04 || 1);
		const top = rawMax + pad;
		const bottom = rawMin - pad;
		const firstAt = points[0]!.at;
		const lastAt = points[points.length - 1]!.at;
		const timeSpan = Math.max(1, lastAt - firstAt);

		const priced = points.map((point) => ({
			x:
				points.length === 1
					? PADDING_X
					: PADDING_X + ((point.at - firstAt) / timeSpan) * (SPARK_WIDTH - PADDING_X * 2),
			y:
				PADDING_Y +
				((top - point.value) / Math.max(1, top - bottom)) *
					(SPARK_HEIGHT - PADDING_Y * 2),
		}));

		if (priced.length === 1) {
			priced.push({ x: SPARK_WIDTH - PADDING_X, y: priced[0]!.y });
		}

		const line = linePath(priced);
		const first = priced[0]!;
		const last = priced[priced.length - 1]!;

		return {
			line,
			area: `${line} L${last.x.toFixed(2)},${SPARK_HEIGHT} L${first.x.toFixed(2)},${SPARK_HEIGHT} Z`,
			last,
			up: points[points.length - 1]!.value >= points[0]!.value,
		};
	}, [history]);

	if (!chart) {
		return <div className={cn("h-10 w-32 rounded bg-l2/60", className)} aria-hidden="true" />;
	}

	const stroke = chart.up ? "var(--green-text)" : "var(--red-text)";

	return (
		<svg
			viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
			preserveAspectRatio="none"
			className={cn("h-10 w-full overflow-visible", className)}
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={stroke} stopOpacity="0.24" />
					<stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
				</linearGradient>
			</defs>
			<path d={chart.area} fill={`url(#${gradientId})`} />
			<path
				d={chart.line}
				fill="none"
				stroke={stroke}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<circle
				cx={chart.last.x}
				cy={chart.last.y}
				r="2.5"
				fill="var(--l1)"
				stroke={stroke}
				strokeWidth="2"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

export function LeaderboardHistoryChart({
	history,
	quoteAsset,
	className,
	heightClassName = "h-48",
}: {
	history: LeaderboardHistoryPoint[];
	quoteAsset: string;
	className?: string;
	heightClassName?: string;
}) {
	const gradientId = useId().replaceAll(":", "");

	const chart = useMemo(() => {
		const points = toPoints(history);
		if (points.length === 0) return null;

		const values = points.flatMap((point) => [point.equity, point.netContributions]);
		const rawMin = Math.min(...values);
		const rawMax = Math.max(...values);
		const span = rawMax - rawMin;
		const pad = span > 0 ? span * 0.12 : Math.max(1, Math.abs(rawMax) * 0.02 || 1);
		const top = rawMax + pad;
		const bottom = rawMin - pad;
		const firstAt = points[0]!.at;
		const lastAt = points[points.length - 1]!.at;
		const timeSpan = Math.max(1, lastAt - firstAt);

		const xFor = (at: number) =>
			points.length === 1
				? PADDING_X
				: PADDING_X + ((at - firstAt) / timeSpan) * (CHART_WIDTH - PADDING_X * 2);
		const yFor = (value: number) =>
			PADDING_Y +
			((top - value) / Math.max(1, top - bottom)) * (CHART_HEIGHT - PADDING_Y * 2);

		const equity = points.map((point) => ({ x: xFor(point.at), y: yFor(point.equity) }));
		const contributions = points.map((point) => ({
			x: xFor(point.at),
			y: yFor(point.netContributions),
		}));

		if (equity.length === 1) {
			const x = CHART_WIDTH - PADDING_X;
			equity.push({ x, y: equity[0]!.y });
			contributions.push({ x, y: contributions[0]!.y });
		}

		const line = linePath(equity);
		const first = equity[0]!;
		const last = equity[equity.length - 1]!;

		return {
			line,
			baseline: linePath(contributions),
			area: `${line} L${last.x.toFixed(2)},${CHART_HEIGHT} L${first.x.toFixed(2)},${CHART_HEIGHT} Z`,
			last,
			mid: (top + bottom) / 2,
			top,
			bottom,
			firstAt,
			lastAt,
			up: points[points.length - 1]!.equity >= points[0]!.equity,
		};
	}, [history]);

	if (!chart) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-lg border border-dashed border-border/50 px-6 text-center text-xs text-medium-emphasis",
					heightClassName,
					className,
				)}
			>
				Portfolio history will appear after the first snapshot.
			</div>
		);
	}

	const stroke = chart.up ? "var(--green-text)" : "var(--red-text)";

	return (
		<div className={cn("w-full", className)}>
			<div className={cn("relative w-full", heightClassName)}>
				<svg
					role="img"
					aria-label={`Portfolio equity over the selected range, ending at ${compact(
						Math.max(...toPoints(history).map((point) => point.equity)),
					)}`}
					viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
					preserveAspectRatio="none"
					className="h-full w-full overflow-visible"
				>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
							<stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
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
						d={chart.baseline}
						fill="none"
						stroke="var(--low-emphasis)"
						strokeWidth="1.25"
						strokeDasharray="5 6"
						vectorEffect="non-scaling-stroke"
					/>
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
						cy={chart.last.y}
						r="3.5"
						fill="var(--l1)"
						stroke={stroke}
						strokeWidth="2.5"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				<div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-1 text-[10px] text-low-emphasis tabular-nums">
					<span>{axisLabel(chart.top, chart.top - chart.bottom)}</span>
					<span>{axisLabel(chart.mid, chart.top - chart.bottom)}</span>
					<span>{axisLabel(chart.bottom, chart.top - chart.bottom)}</span>
				</div>
			</div>

			<div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-low-emphasis tabular-nums">
				<span>{dateLabel(chart.firstAt)}</span>
				<span className="flex items-center gap-4">
					<span className="inline-flex items-center gap-1.5">
						<span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: stroke }} />
						Equity
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="h-0 w-4 border-t border-dashed border-low-emphasis" />
						Contributions
					</span>
				</span>
				<span>{dateLabel(chart.lastAt)}</span>
			</div>

			<p className="mt-1 text-right text-[10px] text-low-emphasis">Values in {quoteAsset}</p>
		</div>
	);
}
