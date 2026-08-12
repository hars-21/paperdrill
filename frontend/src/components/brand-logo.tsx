import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme-provider";
import { brandIcon } from "@/assets";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
	href?: string;
	showText?: boolean;
	showBeta?: boolean;
	className?: string;
	imageClassName?: string;
}

export function BrandLogo({
	href = "/",
	showText = true,
	showBeta = true,
	className,
	imageClassName,
}: BrandLogoProps) {
	const { theme } = useTheme();
	const src = brandIcon(theme);

	const content = (
		<>
			<img
				src={src}
				alt="PaperDrill"
				className={cn("h-6 w-auto object-contain", imageClassName)}
				width={32}
				height={32}
				decoding="async"
			/>
			{showText && (
				<span className="text-lg font-semibold border-l border-l-border pl-2">
					PaperDrill
					{showBeta && (
						<span className="text-[10px] font-medium text-primary p-0.5 tracking-tighter">
							Beta
						</span>
					)}
				</span>
			)}
		</>
	);

	if (href) {
		return (
			<Link to={href} className={cn("flex items-center gap-2 shrink-0", className)}>
				{content}
			</Link>
		);
	}

	return <div className={cn("flex items-center gap-2 shrink-0", className)}>{content}</div>;
}
