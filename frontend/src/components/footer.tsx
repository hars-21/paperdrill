export function Footer() {
	return (
		<footer className="border-t border-border/40 py-12 bg-card/20">
			<div className="mx-auto max-w-6xl px-6">
				<div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
					<div>
						<a href="/" className="text-lg font-semibold tracking-tight">
							Atlas
						</a>
						<p className="mt-1 text-sm text-muted-foreground">
							Transparent market infrastructure for developers.
						</p>
					</div>
					<div className="flex gap-8 text-sm text-muted-foreground">
						<a href="#" className="transition-colors hover:text-high-emphasis">
							Docs
						</a>
						<a href="#" className="transition-colors hover:text-high-emphasis">
							GitHub
						</a>
						<a href="#" className="transition-colors hover:text-high-emphasis">
							Status
						</a>
					</div>
				</div>
				<div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground sm:text-left">
					&copy; {new Date().getFullYear()} Atlas. All rights reserved.
				</div>
			</div>
		</footer>
	);
}

export default Footer;
