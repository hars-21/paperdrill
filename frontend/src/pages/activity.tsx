import { AccountPage } from "@/components/account-page";
import { DataPanel } from "@/components/market/data-panel";

export function ActivityPage() {
	return (
		<AccountPage
			title="Orders & trades"
			description="Review balances, open orders, order history and completed trades."
		>
			<div className="overflow-hidden rounded-xl border border-border/60 bg-l1">
				<DataPanel />
			</div>
		</AccountPage>
	);
}
