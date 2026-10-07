export function SkipLink({ target = "main-content" }: { target?: string }) {
	return (
		<a
			href={`#${target}`}
			className="fixed left-3 top-3 z-100 -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
		>
			Skip to content
		</a>
	);
}
