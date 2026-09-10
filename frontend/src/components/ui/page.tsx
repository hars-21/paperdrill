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
		<div data-slot="page-header" className="shrink-0 select-none border-b border-border/40">
			<div
				className={cn(
					"mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6",
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
				"mx-auto mb-12 min-h-0 w-full max-w-6xl flex-1 space-y-6 px-4 py-6 select-none sm:px-6 sm:py-8",
				className,
			)}
			{...props}
		/>
	);
}

export { Page, PageHeader, PageContent };
export type { PageProps };
