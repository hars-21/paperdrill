import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
	return (
		<section className="px-6 py-20 lg:py-28">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="text-3xl font-extrabold tracking-tight text-high-emphasis sm:text-4xl lg:text-5xl">
					Risk nothing. <span className="text-primary">Learn everything.</span>
				</h2>
				<div className="mt-8">
					<Link to="/signup">
						<Button size="lg" className="gap-1.5 px-8">
							Start Trading <ArrowRight className="size-4" />
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}

export default CtaSection;
