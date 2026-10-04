import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FeedbackState({
	title,
	description,
	icon: Icon,
	action,
	className,
}: {
	title: string;
	description?: ReactNode;
	icon?: LucideIcon;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn("flex min-h-64 flex-col items-center justify-center px-6 text-center", className)}
		>
			{Icon && <Icon className="size-7 text-low-emphasis" aria-hidden="true" />}
			<p className={cn("font-medium text-high-emphasis", Icon && "mt-3")}>{title}</p>
			{description && <p className="mt-1 max-w-md text-sm text-medium-emphasis">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

export function InlineNotice({
	children,
	tone = "neutral",
	className,
}: {
	children: ReactNode;
	tone?: "neutral" | "error";
	className?: string;
}) {
	return (
		<div
			role={tone === "error" ? "alert" : "status"}
			aria-live={tone === "error" ? "assertive" : "polite"}
			className={cn(
				"border-b border-border/40 px-4 py-2.5 text-xs sm:px-5",
				tone === "error" ? "text-red-text" : "bg-l2 text-medium-emphasis",
				className,
			)}
		>
			{children}
		</div>
	);
}
