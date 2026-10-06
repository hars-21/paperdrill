import { LandingVisual } from "./landing-visual";

export default function TradingModesSection() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:py-28">
			<div className="mx-auto max-w-7xl">
				<div className="max-w-xl">
					<h2 className="text-3xl font-semibold tracking-[-0.035em] text-high-emphasis sm:text-4xl">
						One market, two ways in.
					</h2>
					<p className="mt-4 text-base leading-7 text-medium-emphasis">
						Place every order from the trading screen, or bring a strategy through the API.
					</p>
				</div>

				<div className="mt-10 grid gap-8 md:grid-cols-12 md:items-start lg:gap-12">
					<figure className="md:col-span-8">
						<LandingVisual
							src="/landing/landing-trading.webp"
							alt="PaperDrill browser trading interface with chart, order book, and order controls"
							filename="landing-trading.webp"
							dimensions="1600 x 1000"
							className="aspect-[8/5]"
						/>
						<figcaption className="mt-5 max-w-lg">
							<h3 className="text-lg font-medium text-high-emphasis">Trade in the browser</h3>
							<p className="mt-2 text-sm leading-6 text-medium-emphasis">
								Market data, orders, and portfolio context stay together.
							</p>
						</figcaption>
					</figure>

					<figure className="md:col-span-4 md:pt-20">
						<LandingVisual
							src="/landing/landing-api-trading.webp"
							alt="Developer workflow connecting an automated trading bot to PaperDrill"
							filename="landing-api-trading.webp"
							dimensions="1000 x 1200"
							className="aspect-[5/6]"
						/>
						<figcaption className="mt-5">
							<h3 className="text-lg font-medium text-high-emphasis">Connect a bot</h3>
							<p className="mt-2 text-sm leading-6 text-medium-emphasis">
								Scoped API keys use the same markets and matching engine.
							</p>
						</figcaption>
					</figure>
				</div>
			</div>
		</section>
	);
}
