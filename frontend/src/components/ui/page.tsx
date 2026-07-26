import * as React from "react";
import { cn } from "@/lib/utils";

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
	fixed?: boolean;
}

function Page({ className, fixed = false, ...props }: PageProps) {
	return (
		<div
			data-slot="page"
			className={cn(
				"w-full flex-1 flex flex-col min-h-0",
				fixed ? "overflow-hidden h-full max-h-full" : "overflow-y-auto h-full",
				className,
			)}
			{...props}
		/>
	);
}

function PageHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="page-header"
			className="border-b border-border/40 shrink-0 select-none"
		>
			<div
				className={cn(
					"mx-auto max-w-6xl px-6 py-5 flex items-center justify-between gap-4",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function PageContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="page-content"
			className={cn(
				"flex-1 min-h-0 px-6 py-8 space-y-6 max-w-6xl mx-auto w-full select-none",
				className,
			)}
			{...props}
		/>
	);
}

export { Page, PageHeader, PageContent };
export type { PageProps };
