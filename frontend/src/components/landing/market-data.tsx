import marketData from "@/assets/market-data.png";
import { Safari } from "../ui/safari";

export default function MarketDataSection() {
	return (
		<section id="features" className="bg-background px-6 py-16 lg:py-24">
			<div className="mx-auto max-w-4xl text-center">
				<h2 className="text-2xl font-bold tracking-tight text-high-emphasis sm:text-3xl lg:text-4xl">
					Real-Time Market Data
				</h2>
				<p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-medium-emphasis sm:text-base">
					Order book, trades and prices stream over a live WebSocket feed. Watch the market react
					the moment an order lands.
				</p>
			</div>

			<div className="mx-auto mt-12 max-w-4xl">
				<Safari url="paperdrill.dev" imageSrc={marketData} />
			</div>
		</section>
	);
}
