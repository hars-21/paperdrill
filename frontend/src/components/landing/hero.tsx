import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
import { LandingVisual } from "./landing-visual";
import { landing } from "@/assets";

export function Hero() {
	const { user, loading } = useAuth();

	return (
		<section className="px-4 sm:px-6">
			<div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-7xl content-center gap-10 py-12 md:py-14 lg:grid-cols-12 lg:items-center lg:gap-x-12">
				<div className="lg:col-span-5">
					<h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-high-emphasis sm:text-6xl lg:text-[4rem]">
						Trade the market. Earn your rank.
					</h1>
					<p className="mt-6 max-w-md text-base leading-7 text-medium-emphasis sm:text-lg">
						A live trading arena with real order books, global rankings, and API access for bots.
					</p>

					<div className="mt-8 flex flex-wrap items-center gap-3">
						{loading ? (
							<Button size="lg" className="h-11 rounded-lg px-5" disabled>
								Loading…
							</Button>
						) : (
							<Button asChild size="lg" className="h-11 rounded-lg px-5">
								<Link to={user ? "/home" : "/signup"}>{user ? "Go to home" : "Start trading"}</Link>
							</Button>
						)}
						<Button asChild size="lg" variant="outline" className="h-11 rounded-lg px-5">
							<Link to="/leaderboard">View leaderboard</Link>
						</Button>
					</div>
				</div>

				<div className="lg:col-span-7">
					<LandingVisual
						src={landing.arena}
						alt="PaperDrill trading arena showing live markets and account performance"
						width={1586}
						height={992}
						eager
						className="aspect-8/5 shadow-[0_28px_80px_-48px_color-mix(in_srgb,var(--foreground)_35%,transparent)]"
					/>
				</div>
			</div>
		</section>
	);
}

export default Hero;
