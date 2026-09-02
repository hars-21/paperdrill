import { DashboardPage } from "@/components/dashboard-page";
import { DataPanel } from "@/components/market/data-panel";

export function DashboardDataPage() {
	return (
		<DashboardPage
			title="Account data"
			description="Review balances, open orders, order history and completed trades."
		>
			<div className="overflow-hidden rounded-xl border border-border/60 bg-l1">
				<DataPanel />
			</div>
		</DashboardPage>
	);
}
