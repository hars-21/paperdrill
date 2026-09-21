import {
	ChartArea,
	ChartCandlestick,
	ChartLine,
	ChartNoAxesColumn,
	ChevronDown,
	LocateFixed,
	Maximize2,
	RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CANDLE_INTERVALS, type CandleInterval } from "../../hooks/use-candles";
import type { ChartStyle } from "./chart-utils";

const CHART_STYLES = [
	{ value: "candlestick", label: "Candle", Icon: ChartCandlestick },
	{ value: "line", label: "Line", Icon: ChartLine },
	{ value: "area", label: "Area", Icon: ChartArea },
] as const;

type ChartToolbarProps = {
	interval: CandleInterval;
	chartStyle: ChartStyle;
	showVolume: boolean;
	onIntervalChange: (interval: CandleInterval) => void;
	onChartStyleChange: (style: ChartStyle) => void;
	onToggleVolume: () => void;
	onGoLive: () => void;
	onReset: () => void;
	onFullscreen: () => void;
};

export function ChartToolbar({
	interval,
	chartStyle,
	showVolume,
	onIntervalChange,
	onChartStyleChange,
	onToggleVolume,
	onGoLive,
	onReset,
	onFullscreen,
}: ChartToolbarProps) {
	const activeChartStyle =
		CHART_STYLES.find((option) => option.value === chartStyle) ?? CHART_STYLES[0];
	const ActiveChartIcon = activeChartStyle.Icon;

	return (
		<div className="flex h-10 shrink-0 items-center justify-between border-b border-border/40 px-2">
			<div className="flex items-center gap-1">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="gap-1.5 px-2 text-xs focus-visible:border-transparent focus-visible:brightness-100 focus-visible:ring-0"
						>
							<span className="w-10">{interval}</span>
							<ChevronDown className="size-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-24" portalled={false}>
						<DropdownMenuRadioGroup
							value={interval}
							onValueChange={(value) => onIntervalChange(value as CandleInterval)}
						>
							{CANDLE_INTERVALS.map((item) => (
								<DropdownMenuRadioItem key={item} value={item} className="text-xs">
									{item}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="mx-1 h-4 w-px bg-border/70" />

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-28 justify-between gap-1.5 px-2 text-xs focus-visible:border-transparent focus-visible:brightness-100 focus-visible:ring-0"
						>
							<span className="flex items-center gap-1.5">
								<ActiveChartIcon className="size-3.5" />
								{activeChartStyle.label}
							</span>
							<ChevronDown className="size-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-28 min-w-28" portalled={false}>
						<DropdownMenuRadioGroup
							value={chartStyle}
							onValueChange={(value) => onChartStyleChange(value as ChartStyle)}
						>
							{CHART_STYLES.map(({ value, label, Icon }) => (
								<DropdownMenuRadioItem key={value} value={value} className="text-xs">
									<Icon className="size-3.5" />
									{label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="mx-1 hidden h-4 w-px bg-border/70 sm:block" />

				<Button
					type="button"
					variant={showVolume ? "secondary" : "ghost"}
					size="sm"
					className="px-2 text-xs"
					onClick={onToggleVolume}
				>
					<ChartNoAxesColumn className="size-3.5" />
					<span className="hidden sm:inline">Volume</span>
				</Button>
			</div>

			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="icon"
					size="icon-sm"
					onClick={onGoLive}
					title="Go to latest price"
					aria-label="Go to latest price"
				>
					<LocateFixed />
				</Button>
				<Button
					type="button"
					variant="icon"
					size="icon-sm"
					onClick={onReset}
					title="Reset chart"
					aria-label="Reset chart"
				>
					<RotateCcw />
				</Button>
				<Button
					type="button"
					variant="icon"
					size="icon-sm"
					onClick={onFullscreen}
					title="Fullscreen"
					aria-label="Fullscreen"
				>
					<Maximize2 />
				</Button>
			</div>
		</div>
	);
}
