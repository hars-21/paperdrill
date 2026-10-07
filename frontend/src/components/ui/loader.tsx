import { cn } from "@/lib/utils";

export function Loader({ className }: { className?: string }) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn("flex min-h-48 w-full flex-1 items-center justify-center", className)}
		>
			<div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			<span className="sr-only">Loading…</span>
		</div>
	);
}

export default Loader;
