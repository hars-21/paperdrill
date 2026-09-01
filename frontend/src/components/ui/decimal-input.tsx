import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AssetIcon } from "../icons/asset-icon";

export interface DecimalInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
	value: string;
	onChange: (value: string) => void;
	precision?: number;
	min?: string | number;
	step?: string | number;
	placeholder?: string;
	asset?: string;
	assetClassName?: string;
	className?: string;
}

const DECIMAL_RE = /^\d*\.?\d*$/;

function decimalPlaces(value: string) {
	return value.split(".")[1]?.length ?? 0;
}

function formatFinalValue(value: number, precision: number) {
	const factor = 10 ** precision;
	return String(Math.round(value * factor) / factor);
}

export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(function DecimalInput(
	{
		value,
		onChange,
		precision = 2,
		min,
		step,
		placeholder = "0",
		asset,
		assetClassName,
		className,
		disabled,
		onKeyDown,
		...props
	},
	ref,
) {
	const [focused, setFocused] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const next = e.target.value.replaceAll(",", "");
		if (!DECIMAL_RE.test(next) || decimalPlaces(next) > precision) return;
		onChange(next);
	};

	const handleBlur = () => {
		setFocused(false);
		if (!value) return;
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) {
			onChange("");
			return;
		}
		const minNum = Number(min);
		const maxNum = Number(props.max);
		let next = parsed;
		if (Number.isFinite(minNum)) next = Math.max(next, minNum);
		if (Number.isFinite(maxNum)) next = Math.min(next, maxNum);
		onChange(formatFinalValue(next, precision));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
			onKeyDown?.(event);
			return;
		}
		event.preventDefault();
		const factor = 10 ** precision;
		const stepValue = Number(step);
		const stepUnits = Math.max(1, Math.round((Number.isFinite(stepValue) && stepValue > 0 ? stepValue : 1 / factor) * factor));
		const minValue = Number(min);
		const maxValue = Number(props.max);
		let units = Number.isFinite(Number(value)) ? Math.round(Number(value) * factor) : 0;
		units += event.key === "ArrowUp" ? stepUnits : -stepUnits;
		if (Number.isFinite(minValue)) units = Math.max(units, Math.round(minValue * factor));
		if (Number.isFinite(maxValue)) units = Math.min(units, Math.round(maxValue * factor));
		onChange(String(units / factor));
	};

	return (
		<div className="relative">
			<input
				{...props}
				ref={ref}
				type="text"
				inputMode="decimal"
				autoComplete="off"
				dir="ltr"
				placeholder={placeholder}
				value={value}
				disabled={disabled}
				onFocus={() => setFocused(true)}
				onBlur={handleBlur}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				role="spinbutton"
				aria-valuemin={min === undefined ? undefined : Number(min)}
				aria-valuemax={props.max === undefined ? undefined : Number(props.max)}
				aria-valuenow={Number.isFinite(Number(value)) ? Number(value) : undefined}
				className={cn(
					"bg-l3 border-border/60 placeholder-medium-emphasis border-1.5 w-full rounded-lg border-solid pr-12 text-left ring-0 text-lg tabular-nums text-high-emphasis outline-none h-11 px-3 placeholder:font-normal",
					focused && "border-primary focus:border-primary",
					disabled && "opacity-50 cursor-not-allowed",
					asset && "pr-12",
					className,
				)}
			/>
			{asset && (
				<div
					className={cn(
						"flex flex-row pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 p-2",
						disabled && "opacity-50",
					)}
				>
					<div className="overflow-hidden rounded-full">
						<AssetIcon asset={asset} className={cn("size-6 object-contain", assetClassName)} />
					</div>
				</div>
			)}
		</div>
	);
});
