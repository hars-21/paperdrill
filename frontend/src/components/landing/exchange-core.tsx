import { landing } from "@/assets";
import { LandingVisual } from "./landing-visual";

export default function ExchangeCoreSection() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:py-28">
			<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
				<div className="lg:col-span-4">
					<h2 className="text-3xl font-semibold tracking-[-0.035em] text-high-emphasis sm:text-4xl">
						A real exchange underneath.
					</h2>
					<p className="mt-4 text-base leading-7 text-medium-emphasis">
						Orders follow price-time priority. Balances persist, data streams live, and API clients
						use the same book.
					</p>
				</div>

				<div className="lg:col-span-8">
					<LandingVisual
						src={landing.exchange}
						alt="PaperDrill exchange infrastructure showing the path from order entry to matching and live market data"
						className="aspect-video"
					/>
				</div>
			</div>
		</section>
	);
}
