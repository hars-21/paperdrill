import { useState } from "react";

const MARKS = [0, 25, 50, 75, 100];

export function PercentageSlider({ disabled }: { disabled?: boolean }) {
	const [value, setValue] = useState(0);

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (disabled) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const percentage = ((e.clientX - rect.left) / rect.width) * 100;

		const snapped = Math.round(percentage / 25) * 25;
		setValue(Math.min(100, Math.max(0, snapped)));
	};

	return (
		<div className="w-full select-none">
			<div className="px-2">
				<div className="relative h-4 cursor-pointer" onClick={handleClick}>
					<div className="absolute top-1/2 h-1.25 w-full -translate-y-1/2 rounded-full bg-l3" />

					<div
						className="absolute left-0 top-1/2 h-1.25 -translate-y-1/2 rounded-full bg-chart-5"
						style={{ width: `${value}%` }}
					/>

					{MARKS.map((mark) => (
						<div
							key={mark}
							className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2  ${value >= mark ? "border-chart-5 bg-chart-5" : "border-l3 bg-l1"}`}
							style={{ left: `${mark}%` }}
						/>
					))}

					<button
						type="button"
						aria-label={`Percentage: ${value}%`}
						className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-5 shadow-sm"
						style={{ left: `${value}%` }}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "ArrowRight" || e.key === "ArrowUp") {
								e.preventDefault();
								setValue((v) => Math.min(100, v + 25));
							}

							if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
								e.preventDefault();
								setValue((v) => Math.max(0, v - 25));
							}
						}}
					/>
				</div>
			</div>

			<div className="mt-1 flex justify-between text-xs leading-none text-muted-foreground">
				<span className="pl-1">0</span>
				<span>100%</span>
			</div>
		</div>
	);
}
