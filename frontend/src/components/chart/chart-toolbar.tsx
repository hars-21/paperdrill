import { ChartNoAxesColumn, ChevronDown, LocateFixed, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CANDLE_INTERVALS, type CandleInterval } from "../../hooks/use-candles";

type ChartToolbarProps = {
	interval: CandleInterval;
	showVolume: boolean;
	onIntervalChange: (interval: CandleInterval) => void;
	onToggleVolume: () => void;
	onGoLive: () => void;
	onReset: () => void;
	onFullscreen: () => void;
};

export function ChartToolbar({
	interval,
	showVolume,
	onIntervalChange,
	onToggleVolume,
	onGoLive,
	onReset,
	onFullscreen,
}: ChartToolbarProps) {
	return (
		<div className="flex h-10 shrink-0 items-center justify-between border-b border-border/40 px-2">
			<div className="flex items-center gap-1">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="ghost" size="sm" className="gap-1.5 px-2 text-xs">
							<span className="w-10">{interval}</span>
							<ChevronDown className="size-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-24">
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
