import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardPage({
	title,
	description,
	action,
	children,
	className,
}: {
	title: string;
	description: string;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8", className)}>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-high-emphasis">{title}</h1>
					<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">{description}</p>
				</div>
				{action}
			</div>
			{children}
		</div>
	);
}
