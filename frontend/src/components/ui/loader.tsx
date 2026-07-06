import { cn } from "@/lib/utils";

export function Loader({ className }: { className?: string }) {
	return (
		<div className={cn("min-h-dvh w-full flex items-center justify-center", className)}>
			<div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
		</div>
	);
}

export default Loader;
