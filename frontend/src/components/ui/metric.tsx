import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

function MetricGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="metric-group"
			className={cn("grid overflow-hidden rounded-lg border border-border/60 bg-l1", className)}
			{...props}
		/>
	);
}

function Metric({
	label,
	value,
	className,
	valueClassName,
}: {
	label: React.ReactNode;
	value: React.ReactNode | null;
	className?: string;
	valueClassName?: string;
}) {
	return (
		<div data-slot="metric" className={cn("border-border/40 px-4 py-4 sm:px-5", className)}>
			<p className="text-sm text-medium-emphasis">{label}</p>
			{value == null ? (
				<Skeleton className="mt-2 h-7 w-24" />
			) : (
				<p className={cn("mt-1 truncate text-xl font-semibold tabular-nums text-high-emphasis", valueClassName)}>
					{value}
				</p>
			)}
		</div>
	);
}

export { Metric, MetricGroup };
