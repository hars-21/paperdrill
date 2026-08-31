import { useEffect, useRef, useState, forwardRef } from "react";
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

const DECIMAL_RE = /^[0-9]*\.?[0-9]*$/;

function clampPrecision(val: string, precision: number): string {
	const [int = "", dec = ""] = val.split(".");
	if (precision > 0 && dec.length > precision) {
		return `${int}.${dec.slice(0, precision)}`;
	}
	return `${int}${dec ? "." + dec : ""}`;
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
		...props
	},
	ref,
) {
	const [focused, setFocused] = useState(false);
	const lastValueRef = useRef(value);

	useEffect(() => {
		lastValueRef.current = value;
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;

		const filtered = raw
			.replace(/[^0-9.]/g, "")
			.replace(/^(\d+\.\d*)\.\d*$/, "$1");

		if (!filtered && raw !== "") return;

		const cleaned = clampPrecision(filtered, precision);
		lastValueRef.current = cleaned;
		onChange(cleaned);
	};

	const handleBlur = () => {
		setFocused(false);
		const current = lastValueRef.current;
		if (!current || !Number.isFinite(Number(current))) return;

		const stepNum = Number(step);
		const minNum = Number(min);
		let num = Number(current);

		if (Number.isFinite(minNum) && num < minNum) {
			num = minNum;
		}

		if (Number.isFinite(stepNum) && stepNum > 0) {
			const base = Number.isFinite(minNum) ? minNum : 0;
			const snapped = Math.floor((num - base) / stepNum + 0.0000001) * stepNum + base;
			if (Number.isFinite(snapped)) num = snapped;
		}

		const fixed = num.toFixed(precision);
		const next = Number.isFinite(Number(fixed)) ? String(Number(fixed)) : current;

		lastValueRef.current = next;
		onChange(next);
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
