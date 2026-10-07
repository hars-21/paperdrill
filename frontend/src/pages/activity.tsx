import { Link } from "react-router-dom";
import { DataPanel } from "@/components/market/data-panel";
import { Button } from "@/components/ui/button";
import { Page, PageContent } from "@/components/ui/page";

export function ActivityPage() {
	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">
							Orders & trades
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
							Monitor open orders, review execution history and manage active orders.
						</p>
					</div>
					<Button asChild size="sm">
						<Link to="/markets">Trade</Link>
					</Button>
				</header>

				<section
					className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
					aria-label="Order and trade activity"
				>
					<DataPanel showBalances={false} />
				</section>
			</PageContent>
		</Page>
	);
}
