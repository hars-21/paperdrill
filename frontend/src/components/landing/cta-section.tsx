import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
	return (
		<section className="border-t border-border/40 bg-muted/5 px-6 py-16 lg:py-20">
			<div className="mx-auto max-w-2xl text-center">
				<h2 className="mb-3 text-xl font-bold tracking-tight lg:text-2xl">Ready to trade?</h2>
				<p className="mb-8 text-medium-emphasis text-sm">
					Create an account and start trading on a live simulated exchange in minutes. No KYC, no
					real money, no risk.
				</p>
				<div className="flex flex-wrap items-center justify-center gap-3">
					<Link to="/signup">
						<Button size="lg" className="gap-1.5">
							Create Account <ArrowRight className="size-4" />
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}

export default CtaSection;
