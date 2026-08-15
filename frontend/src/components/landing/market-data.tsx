import { screenshots } from "@/assets";

export default function MarketDataSection() {
	return (
		<section className="bg-background px-6 py-16 lg:py-24">
			<div className="mx-auto max-w-4xl text-center">
				<h2 className="text-2xl font-bold tracking-tight text-high-emphasis sm:text-3xl lg:text-4xl">
					Real-Time Market Data
				</h2>
				<p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-medium-emphasis sm:text-base">
					Order book, trades and prices stream over a live WebSocket feed. Watch the market react
					the moment an order lands.
				</p>
			</div>

			<div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-border/40 bg-l2/40 shadow-sm">
				<img
					src={screenshots.chart}
					alt="PaperDrill chart interface"
					className="h-full w-full object-cover"
					onError={(e) => {
						e.currentTarget.style.display = "none";
					}}
				/>
			</div>
		</section>
	);
}
