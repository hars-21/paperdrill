import * as React from "react";

import { cn } from "@/lib/utils";

function Input({
	className,
	type,
	size,
	mono,
	...props
}: Omit<React.ComponentProps<"input">, "size"> & {
	size?: "default" | "lg";
	mono?: boolean;
}) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:border-destructive",
				size === "lg" ? "h-10 px-3 py-2 text-sm" : "h-9 px-3 py-1 text-base md:text-sm",
				mono && "tabular-nums",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
