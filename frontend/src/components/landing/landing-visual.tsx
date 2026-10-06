import { useState } from "react";
import { cn } from "@/lib/utils";

interface LandingVisualProps {
	src: string;
	alt: string;
	filename: string;
	dimensions: string;
	className?: string;
	imageClassName?: string;
	eager?: boolean;
}

export function LandingVisual({
	src,
	alt,
	filename,
	dimensions,
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

			{!loaded ? (
				<div
					role="img"
					aria-label={alt}
					className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
				>
					<span className="text-sm font-medium text-high-emphasis">{filename}</span>
					<span className="text-xs text-medium-emphasis">
						Add to public/landing · {dimensions}
					</span>
				</div>
			) : null}
		</div>
	);
}
