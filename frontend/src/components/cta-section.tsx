import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
	return (
		<section className="border-t border-border/40 bg-muted/5 px-6 py-24">
			<div className="mx-auto max-w-2xl text-center">
				<h2 className="mb-4 text-3xl font-bold tracking-tight">Ready to build?</h2>
				<p className="mb-8 text-muted-foreground">
					Create your sandbox and start exploring trading systems in minutes.
				</p>
				<div className="flex flex-wrap items-center justify-center gap-4">
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
