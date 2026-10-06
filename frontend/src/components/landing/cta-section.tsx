import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";

export function CtaSection() {
	const { user, loading } = useAuth();

	return (
		<section className="px-4 py-20 sm:px-6 lg:py-28">
			<div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-2xl border border-border/60 bg-l2 px-6 py-10 sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:px-14">
				<div>
					<h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-high-emphasis sm:text-4xl">
						Start with credits. Trade for rank.
					</h2>
					<p className="mt-3 text-base text-medium-emphasis">
						No real funds. Use the interface or connect your own bot.
					</p>
				</div>
				<div className="shrink-0">
					{loading ? (
						<Button size="lg" className="h-11 rounded-lg px-6" disabled>
							Loading…
						</Button>
					) : (
						<Button asChild size="lg" className="h-11 rounded-lg px-6">
							<Link to={user ? "/home" : "/signup"}>
								{user ? "Go to home" : "Start trading"}
							</Link>
						</Button>
					)}
				</div>
			</div>
		</section>
	);
}

export default CtaSection;
