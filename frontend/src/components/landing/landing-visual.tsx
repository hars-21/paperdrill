import { useState } from "react";
import { cn } from "@/lib/utils";

interface LandingVisualProps {
	src: string;
	alt: string;
	className?: string;
	imageClassName?: string;
	eager?: boolean;
}

export function LandingVisual({
	src,
	alt,
	className,
	imageClassName,
	eager = false,
}: LandingVisualProps) {
	const [loaded, setLoaded] = useState(false);

	return (
		<div
			className={cn(
				"relative isolate overflow-hidden rounded-2xl border border-border/60 bg-l2",
				className,
			)}
		>
			<img
				src={src}
				alt={loaded ? alt : ""}
				loading={eager ? "eager" : "lazy"}
				fetchPriority={eager ? "high" : "auto"}
				decoding="async"
				onLoad={() => setLoaded(true)}
				onError={() => setLoaded(false)}
				className={cn(
					"absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300",
					loaded && "opacity-100",
					imageClassName,
				)}
			/>
		</div>
	);
}
