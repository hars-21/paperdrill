import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { Safari } from "../ui/safari";
import { screenshots } from "@/assets";
import { useAuth } from "@/context/AuthContext";

export function Hero() {
	const { user, loading } = useAuth();

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
					connect a bot via API - no KYC and no real funds at risk.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3">
					{loading ? (
						<Button size="lg" disabled>Loading…</Button>
					) : (
						<Button asChild size="lg" className="gap-1.5">
							<Link to={user ? "/home" : "/signup"}>
								{user ? "Go to home" : "Start trading"} <ArrowRight className="size-4" />
							</Link>
						</Button>
					)}
					<Button asChild size="lg" variant="secondary">
						<Link to="/trade/BTC_USD">Trade now</Link>
					</Button>
				</div>

				<div className="mt-12">
					<Safari url="paperdrill.dev" imageSrc={screenshots.marketData} />
				</div>
			</div>
		</section>
	);
}

export default Hero;
