import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { Safari } from "../ui/safari";
import { screenshots } from "@/assets";

export function Hero() {
	return (
		<section className="bg-background px-6 py-16 pt-28 lg:py-20 lg:pt-40">
			<div className="mx-auto text-center max-w-4xl">
				<h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-high-emphasis">
					The exchange built for
					<br />
					<span className="text-primary">developers</span>, not spectators.
				</h1>

				<p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-medium-emphasis sm:text-lg">
					A live, always-on exchange with a real matching engine and order book. Trade on the UI or
					connect a bot via API - no KYC, no real money, no risk.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3">
					<Link to="/signup">
						<Button size="lg" className="gap-1.5">
							Get Started <ArrowRight className="size-4" />
						</Button>
					</Link>
					<Link to="/trade/BTC_USD">
						<Button size="lg" variant="secondary">
							Open Playground
						</Button>
					</Link>
				</div>

				<div className="mt-12">
					<Safari url="paperdrill.dev" imageSrc={screenshots.marketData} />
				</div>
			</div>
		</section>
	);
}

export default Hero;
