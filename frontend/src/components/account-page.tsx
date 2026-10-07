import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/ui/page";

export function AccountPage({
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
			<PageHeading className="mb-6" title={title} description={description} action={action} />
			{children}
		</div>
	);
}
