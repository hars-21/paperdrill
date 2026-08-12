import trading from "@/assets/trading.png";

export default function MatchingEngineSection() {
	return (
		<section className="bg-background px-6 py-16 lg:py-24">
			<div className="mx-auto flex max-w-5xl flex-col items-center gap-10 lg:flex-row lg:gap-16">
				<div className="w-full max-w-xs lg:w-2/5 lg:max-w-sm">
					<div className="aspect-3/4 overflow-hidden rounded-2xl border border-border/40 bg-l2/40 shadow-sm">
						<img
							src={trading}
							alt="PaperDrill trading interface"
							className="h-full w-full object-cover"
							onError={(e) => {
								e.currentTarget.style.display = "none";
							}}
						/>
					</div>
				</div>

				<div className="flex-1">
					<h2 className="text-2xl font-bold tracking-tight text-high-emphasis sm:text-3xl">
						A real matching engine, not a demo.
					</h2>
					<ul className="mt-6 space-y-3 text-sm leading-relaxed text-medium-emphasis sm:text-base">
						<li className="flex items-start gap-3">
							<span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
							<span>Every order is matched by price-time priority.</span>
						</li>
						<li className="flex items-start gap-3">
							<span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
							<span>Limit and market orders hit the live book and execute instantly.</span>
						</li>
					</ul>
				</div>
			</div>
		</section>
	);
}
