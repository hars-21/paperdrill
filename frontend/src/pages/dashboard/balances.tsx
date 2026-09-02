import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardPage } from "@/components/dashboard-page";
import { AssetIcon, assetNames } from "@/components/icons/asset-icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useMarkets } from "@/context/MarketContext";
import { api } from "@/lib/api";
import type { UserBalance } from "@/types";
import { formatQty } from "@/utils/format";

export function DashboardBalancesPage() {
	const { markets } = useMarkets();
	const [balances, setBalances] = useState<UserBalance | null>(null);

	useEffect(() => {
		api
			.getBalance()
			.then(setBalances)
			.catch((error) => {
				console.error("Failed to load balances:", error);
				setBalances({});
				toast.error("Failed to load balances");
			});
	}, []);

	const entries = useMemo(
		() =>
			Object.entries(balances ?? {}).sort(([left], [right]) =>
				left === "USD" ? -1 : right === "USD" ? 1 : left.localeCompare(right),
			),
		[balances],
	);

	const precisionFor = (asset: string) => {
		const market = markets.find((item) => item.baseAsset === asset || item.quoteAsset === asset);
		if (!market) return 4;
		return market.baseAsset === asset ? market.qtyPrecision : market.pricePrecision;
	};

	return (
		<DashboardPage
			title="Balances"
			description="Available funds can be traded immediately. Locked funds are reserved by open orders."
		>
			<div className="overflow-hidden rounded-xl border border-border/60 bg-l1">
				{balances == null ? (
					<div className="space-y-4 p-5">
						{Array.from({ length: 3 }).map((_, index) => (
							<Skeleton key={index} className="h-10" />
						))}
					</div>
				) : entries.length === 0 ? (
					<div className="flex min-h-56 items-center justify-center text-sm text-medium-emphasis">
						No balances available.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-l2/60 hover:bg-l2/60">
									<TableHead className="px-5">Asset</TableHead>
									<TableHead className="text-right">Available</TableHead>
									<TableHead className="text-right">Locked</TableHead>
									<TableHead className="px-5 text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map(([asset, balance]) => {
									const precision = precisionFor(asset);
									const total = Number(balance.available ?? 0) + Number(balance.locked ?? 0);
									return (
										<TableRow key={asset}>
											<TableCell className="px-5 py-4">
												<div className="flex items-center gap-3">
													<AssetIcon asset={asset} className="size-8" />
													<div>
														<p className="font-medium">{asset}</p>
														<p className="text-xs text-medium-emphasis">
															{assetNames[asset] ?? asset}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatQty(balance.available, precision)}
											</TableCell>
											<TableCell className="text-right text-medium-emphasis">
												{formatQty(balance.locked, precision)}
											</TableCell>
											<TableCell className="px-5 text-right font-medium">
												{formatQty(total, precision)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</DashboardPage>
	);
}
