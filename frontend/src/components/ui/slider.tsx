import { cn } from "@/lib/utils";

const MARKS = [0, 25, 50, 75, 100];

type PercentageSliderProps = {
	value: number;
	onChange: (value: number) => void;
	disabled?: boolean;
};

export function PercentageSlider({ value, onChange, disabled = false }: PercentageSliderProps) {
	const safeValue = Math.min(100, Math.max(0, value));

	return (
		<div className={cn("w-full select-none", disabled && "opacity-45")}>
			<div className="relative mx-1 h-5">
				<div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-l3" />
				<div
					className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-chart-5"
					style={{ width: `${safeValue}%` }}
				/>
				{MARKS.map((mark) => (
					<div
						key={mark}
						className={cn(
							"pointer-events-none absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
							safeValue >= mark ? "border-chart-5 bg-chart-5" : "border-l3 bg-card",
						)}
						style={{ left: `${mark}%` }}
					/>
				))}
				<div
					className="pointer-events-none absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-chart-5"
					style={{ left: `${safeValue}%` }}
				/>
				<input
					type="range"
					min={0}
					max={100}
					step={25}
					value={safeValue}
					disabled={disabled}
					onChange={(event) => onChange(Number(event.target.value))}
					aria-label="Order size percentage"
					className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
				/>
			</div>

			<div className="mt-1 flex justify-between text-xs leading-none text-muted-foreground">
				<span>0</span>
				<span>100%</span>
			</div>
		</div>
	);
}
