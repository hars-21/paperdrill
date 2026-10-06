import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function CtaSection() {
	const { user, loading } = useAuth();

	return (
		<section className="px-6 py-20 lg:py-28">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="text-3xl font-extrabold tracking-tight text-high-emphasis sm:text-4xl lg:text-5xl">
					Risk nothing. <span className="text-primary">Learn everything.</span>
				</h2>
				<div className="mt-8">
					{loading ? (
						<Button size="lg" className="px-8" disabled>Loading…</Button>
					) : (
						<Button asChild size="lg" className="gap-1.5 px-8">
							<Link to={user ? "/home" : "/signup"}>
								{user ? "Go to home" : "Start trading"} <ArrowRight className="size-4" />
							</Link>
						</Button>
					)}
				</div>
			</div>
		</section>
	);
}

export default CtaSection;
