import * as React from "react";
import { cn } from "@/lib/utils";

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
	fixed?: boolean;
}

interface PageHeadingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
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
		<div data-slot="page-header" className="shrink-0 border-b border-border/40">
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
				"mx-auto w-full max-w-6xl shrink-0 space-y-6 px-4 pt-6 pb-4 sm:px-6 sm:pt-8",
				className,
			)}
			{...props}
		/>
	);
}

function PageHeading({ title, description, action, className, ...props }: PageHeadingProps) {
	return (
		<div
			data-slot="page-heading"
			className={cn(
				"flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
				className,
			)}
			{...props}
		>
			<div className="min-w-0">
				<h1 className="text-2xl font-semibold tracking-tight text-high-emphasis">{title}</h1>
				{description && (
					<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">{description}</p>
				)}
			</div>
			{action && <div className="shrink-0 self-start">{action}</div>}
		</div>
	);
}

export { Page, PageHeader, PageContent, PageHeading };
export type { PageProps };
