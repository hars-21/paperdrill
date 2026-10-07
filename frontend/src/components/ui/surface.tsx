import * as React from "react";
import { cn } from "@/lib/utils";

function Surface({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="surface"
			className={cn("overflow-hidden rounded-lg border border-border/60 bg-l1", className)}
			{...props}
		/>
	);
}

function SurfaceHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="surface-header"
			className={cn("border-b border-border/40 px-4 py-4 sm:px-5", className)}
			{...props}
		/>
	);
}

function SurfaceContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div data-slot="surface-content" className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}

function SurfaceFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="surface-footer"
			className={cn("border-t border-border/40 px-4 py-3 sm:px-5", className)}
			{...props}
		/>
	);
}

export { Surface, SurfaceContent, SurfaceFooter, SurfaceHeader };
