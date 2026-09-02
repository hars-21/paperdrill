import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, KeyRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AssetIcon, assetNames } from "@/components/icons/asset-icon";
import { DashboardPage } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import { api } from "@/lib/api";
import type { ApiKeyRecord, OrderRecord, UserBalance, UserTrade } from "@/types";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";

type OverviewData = {
	balances: UserBalance;
	openOrders: OrderRecord[];
	trades: UserTrade[];
	keys: ApiKeyRecord[];
};

export function DashboardOverviewPage() {
	const { user } = useAuth();
	const { markets } = useMarkets();
	const [data, setData] = useState<OverviewData | null>(null);

	useEffect(() => {
		Promise.all([api.getBalance(), api.getOpenOrders(), api.getTradeHistory(5), api.getApiKeys()])
			.then(([balances, openOrders, trades, keyResponse]) => {
				setData({ balances, openOrders, trades, keys: keyResponse.keys });
			})
			.catch((error) => {
				console.error("Failed to load dashboard:", error);
				setData({ balances: {}, openOrders: [], trades: [], keys: [] });
				toast.error("Failed to load dashboard overview");
			});
	}, []);

	const activeKeys = data?.keys.filter((key) => !key.revokedAt).length ?? 0;
	const balanceEntries = useMemo(() => Object.entries(data?.balances ?? {}), [data?.balances]);
	const usdAvailable = data?.balances.USD?.available;

	const precisionFor = (asset: string) => {
		const market = markets.find((item) => item.baseAsset === asset || item.quoteAsset === asset);
		if (!market) return 4;
		return market.baseAsset === asset ? market.qtyPrecision : market.pricePrecision;
	};

	return (
		<DashboardPage
			title={`Welcome back, ${user?.name ?? "trader"}`}
			description="A concise view of your PaperDrill account and recent activity."
			action={
				<Button asChild size="sm">
					<Link to="/trade/BTC_USD">
						Open trading <ArrowRight />
					</Link>
				</Button>
			}
		>
			<div className="grid overflow-hidden rounded-xl border border-border/60 bg-l1 sm:grid-cols-2 xl:grid-cols-4">
				<Metric
					className="border-b sm:border-r xl:border-b-0"
					label="Available USD"
					value={usdAvailable == null ? null : formatPrice(usdAvailable, precisionFor("USD"))}
				/>
				<Metric
					className="border-b xl:border-r xl:border-b-0"
					label="Assets held"
					value={data ? String(balanceEntries.length) : null}
				/>
				<Metric
					className="border-b sm:border-r sm:border-b-0"
					label="Open orders"
					value={data ? String(data.openOrders.length) : null}
				/>
				<Metric label="Active API keys" value={data ? String(activeKeys) : null} />
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
				<Card className="gap-0 border-border/60 py-0 shadow-none">
					<CardHeader className="border-b border-border/40 px-5 py-4">
						<CardTitle className="text-base">Balances</CardTitle>
					</CardHeader>
					<CardContent className="px-0">
						{!data ? (
							<div className="space-y-4 p-5">
								<Skeleton className="h-8" />
								<Skeleton className="h-8" />
							</div>
						) : balanceEntries.length === 0 ? (
							<p className="p-5 text-sm text-medium-emphasis">No balances available.</p>
						) : (
							balanceEntries.slice(0, 4).map(([asset, balance]) => (
								<div
									key={asset}
									className="flex items-center justify-between border-b border-border/30 px-5 py-3 last:border-b-0"
								>
									<div className="flex items-center gap-3">
										<AssetIcon asset={asset} className="size-7" />
										<div>
											<p className="text-sm font-medium">{asset}</p>
											<p className="text-xs text-medium-emphasis">{assetNames[asset] ?? asset}</p>
										</div>
									</div>
									<p className="text-sm font-medium">
										{formatQty(balance.available, precisionFor(asset))}
									</p>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<Card className="gap-0 border-border/60 py-0 shadow-none">
					<CardHeader className="border-b border-border/40 px-5 py-4">
						<CardTitle className="text-base">Recent trades</CardTitle>
					</CardHeader>
					<CardContent className="px-0">
						{!data ? (
							<div className="space-y-4 p-5">
								<Skeleton className="h-8" />
								<Skeleton className="h-8" />
							</div>
						) : data.trades.length === 0 ? (
							<p className="p-5 text-sm text-medium-emphasis">
								Your completed trades will appear here.
							</p>
						) : (
							data.trades.map((trade) => {
								const market = markets.find((item) => item.symbol === trade.symbol);
								return (
									<div
										key={trade.id}
										className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/30 px-5 py-3 last:border-b-0"
									>
										<div>
											<p className="text-sm font-medium">
												<span
													className={trade.side === "BUY" ? "text-green-text" : "text-red-text"}
												>
													{trade.side === "BUY" ? "Bought" : "Sold"}
												</span>{" "}
												{trade.symbol.replace("_", "/")}
											</p>
											<p className="mt-0.5 text-xs text-medium-emphasis">
												{formatDateTime(trade.createdAt)}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm">{formatQty(trade.qty, market?.qtyPrecision)}</p>
											<p className="mt-0.5 text-xs text-medium-emphasis">
												at {formatPrice(trade.price, market?.pricePrecision)}
											</p>
										</div>
									</div>
								);
							})
						)}
					</CardContent>
				</Card>
			</div>

			<div className="mt-6 grid gap-3 md:grid-cols-3">
				<QuickLink
					to="/dashboard/api-keys"
					icon={KeyRound}
					title="Manage API keys"
					text="Connect a bot with scoped access."
				/>
				<QuickLink
					to="/dashboard/balances"
					icon={WalletCards}
					title="View balances"
					text="Review available and locked assets."
				/>
				<QuickLink
					to="/dashboard/data"
					icon={Database}
					title="Account data"
					text="Inspect orders and trade history."
				/>
			</div>
		</DashboardPage>
	);
}

function Metric({
	label,
	value,
	className,
}: {
	label: string;
	value: string | null;
	className?: string;
}) {
	return (
		<div className={`border-border/40 px-5 py-4 ${className ?? ""}`}>
			<p className="text-sm text-medium-emphasis">{label}</p>
			{value == null ? (
				<Skeleton className="mt-2 h-7 w-20" />
			) : (
				<p className="mt-1 text-xl font-semibold text-high-emphasis">{value}</p>
			)}
		</div>
	);
}

function QuickLink({
	to,
	icon: Icon,
	title,
	text,
}: {
	to: string;
	icon: typeof KeyRound;
	title: string;
	text: string;
}) {
	return (
		<Link
			to={to}
			className="group flex items-start gap-3 rounded-xl border border-border/60 bg-l1 p-4 transition-colors hover:bg-l2"
		>
			<Icon className="mt-0.5 size-4 text-medium-emphasis" />
			<div>
				<p className="text-sm font-medium text-high-emphasis">{title}</p>
				<p className="mt-1 text-xs leading-5 text-medium-emphasis">{text}</p>
			</div>
			<ArrowRight className="ml-auto mt-0.5 size-4 text-low-emphasis transition-transform group-hover:translate-x-0.5" />
		</Link>
	);
}
