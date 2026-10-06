import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingVisual } from "./landing-visual";

export default function RankingSection() {
	return (
		<section className="px-4 py-20 sm:px-6 lg:py-28">
			<div className="mx-auto max-w-7xl">
				<div className="max-w-xl">
					<h2 className="text-3xl font-semibold tracking-[-0.035em] text-high-emphasis sm:text-4xl">
						See where you stand.
					</h2>
					<p className="mt-4 text-base leading-7 text-medium-emphasis">
						The global leaderboard ranks verified traders by portfolio return.
					</p>
				</div>

				<LandingVisual
					src="/landing/landing-leaderboard.webp"
					alt="PaperDrill global leaderboard showing trader ranks and portfolio returns"
					filename="landing-leaderboard.webp"
					dimensions="1600 x 900"
					className="mt-10 aspect-[16/9]"
				/>

				<div className="mt-6 flex justify-start">
					<Button asChild variant="outline" className="rounded-lg">
						<Link to="/leaderboard">View leaderboard</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
