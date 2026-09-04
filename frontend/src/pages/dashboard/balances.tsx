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
import { cn } from "@/lib/utils";
import type { Portfolio, PortfolioPosition, UserBalance } from "@/types";
import { formatPrice, formatQty } from "@/utils/format";

type BalanceRow = PortfolioPosition & { precision: number };

export function DashboardBalancesPage() {
	const { markets } = useMarkets();
	const [balances, setBalances] = useState<UserBalance | null>(null);
	const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.allSettled([api.getBalance(), api.getPortfolio()]).then(
			([balanceResult, portfolioResult]) => {
				if (balanceResult.status === "fulfilled") {
					setBalances(balanceResult.value);
				} else {
					setBalances({});
					toast.error("Failed to load balances");
				}

				if (portfolioResult.status === "fulfilled") {
					setPortfolio(portfolioResult.value);
				} else {
					toast.error("Portfolio valuation is temporarily unavailable");
				}

				setLoading(false);
			},
		);
	}, []);

	const precisionFor = (asset: string) => {
		const market = markets.find((item) => item.baseAsset === asset || item.quoteAsset === asset);
		if (!market) return 4;
		return market.baseAsset === asset ? market.qtyPrecision : market.pricePrecision;
	};

	const rows = useMemo<BalanceRow[]>(() => {
		if (portfolio) {
			return portfolio.positions
				.map((position) => ({ ...position, precision: precisionFor(position.asset) }))
				.sort((left, right) =>
					left.asset === portfolio.quoteAsset
						? -1
						: right.asset === portfolio.quoteAsset
							? 1
							: Number(right.value) - Number(left.value),
				);
		}

		return Object.entries(balances ?? {})
			.map(([asset, balance]) => ({
				asset,
				available: balance.available ?? "0",
				locked: balance.locked ?? "0",
				total: String(Number(balance.available ?? 0) + Number(balance.locked ?? 0)),
				markPrice: "",
				value: "",
				precision: precisionFor(asset),
			}))
			.sort((left, right) => (left.asset === "USD" ? -1 : right.asset === "USD" ? 1 : 0));
	}, [balances, markets, portfolio]);

	const pnl = Number(portfolio?.pnl ?? 0);
	const pnlClassName = pnl >= 0 ? "text-green-text" : "text-red-text";
	const quotePosition = portfolio?.positions.find(
		(position) => position.asset === portfolio.quoteAsset,
	);
	const lockedValue = portfolio?.positions.reduce(
		(total, position) => total + Number(position.locked) * Number(position.markPrice),
		0,
	);

	return (
		<DashboardPage
			title="Portfolio & balances"
			description="Portfolio value uses the latest trade price on PaperDrill. Available funds can be traded immediately, while locked funds are reserved by open orders."
		>
			<div className="grid overflow-hidden rounded-xl border border-border/60 bg-l1 sm:grid-cols-2 xl:grid-cols-4">
				<Metric
					className="border-b sm:border-r xl:border-b-0"
					label="Portfolio value"
					value={
						loading
							? null
							: portfolio
								? `${formatPrice(portfolio.equity)} ${portfolio.quoteAsset}`
								: "Unavailable"
					}
				/>
				<Metric
					className="border-b xl:border-r xl:border-b-0"
					label="Total PnL"
					value={
						loading
							? null
							: portfolio
								? `${pnl > 0 ? "+" : ""}${formatPrice(portfolio.pnl)} ${portfolio.quoteAsset}`
								: "Unavailable"
					}
					valueClassName={pnlClassName}
				/>
				<Metric
					className="border-b sm:border-r sm:border-b-0"
					label="Return"
					value={
						loading
							? null
							: portfolio
								? `${pnl > 0 ? "+" : ""}${portfolio.pnlPercent}%`
								: "Unavailable"
					}
					valueClassName={pnlClassName}
				/>
				<Metric
					label="Available cash"
					value={
						loading
							? null
							: quotePosition && portfolio
								? `${formatPrice(quotePosition.available)} ${portfolio.quoteAsset}`
								: "Unavailable"
					}
				/>
			</div>

			<div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-l1">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-5 py-4">
					<div>
						<h2 className="font-semibold text-high-emphasis">Asset breakdown</h2>
						<p className="mt-1 text-sm text-medium-emphasis">
							Balances, current value and share of your portfolio.
						</p>
					</div>
					{portfolio && lockedValue != null ? (
						<p className="text-sm text-medium-emphasis">
							In open orders:{" "}
							<span className="font-medium text-high-emphasis">
								{formatPrice(lockedValue)} {portfolio.quoteAsset}
							</span>
						</p>
					) : null}
				</div>

				{loading ? (
					<div className="space-y-4 p-5">
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton key={index} className="h-12" />
						))}
					</div>
				) : rows.length === 0 ? (
					<div className="flex min-h-56 items-center justify-center text-sm text-medium-emphasis">
						No balances available.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table className="min-w-220 table-fixed">
							<TableHeader>
								<TableRow className="bg-l2/60 hover:bg-l2/60">
									<TableHead className="w-52 px-5">Asset</TableHead>
									<TableHead className="w-36 text-right">Total</TableHead>
									<TableHead className="w-36 text-right">Available</TableHead>
									<TableHead className="w-36 text-right">Locked</TableHead>
									<TableHead className="w-36 text-right">Mark price</TableHead>
									<TableHead className="w-40 text-right">Value</TableHead>
									<TableHead className="w-28 px-5 text-right">Allocation</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row) => {
									const allocation =
										portfolio && Number(portfolio.equity) > 0 && row.value
											? (Number(row.value) / Number(portfolio.equity)) * 100
											: null;

									return (
										<TableRow key={row.asset}>
											<TableCell className="px-5 py-4">
												<div className="flex items-center gap-3">
													<AssetIcon asset={row.asset} className="size-8" />
													<div>
														<p className="font-medium">{row.asset}</p>
														<p className="text-xs text-medium-emphasis">
															{assetNames[row.asset] ?? row.asset}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatQty(row.total, row.precision)}
											</TableCell>
											<TableCell className="text-right">
												{formatQty(row.available, row.precision)}
											</TableCell>
											<TableCell className="text-right text-medium-emphasis">
												{formatQty(row.locked, row.precision)}
											</TableCell>
											<TableCell className="text-right">
												{row.markPrice ? formatPrice(row.markPrice) : "—"}
											</TableCell>
											<TableCell className="text-right font-medium">
												{row.value
													? `${formatPrice(row.value)} ${portfolio?.quoteAsset ?? "USD"}`
													: "—"}
											</TableCell>
											<TableCell className="px-5 text-right">
												{allocation == null ? "—" : `${allocation.toFixed(2)}%`}
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

function Metric({
	label,
	value,
	className,
	valueClassName,
}: {
	label: string;
	value: string | null;
	className?: string;
	valueClassName?: string;
}) {
	return (
		<div className={cn("border-border/40 px-5 py-4", className)}>
			<p className="text-sm text-medium-emphasis">{label}</p>
			{value == null ? (
				<Skeleton className="mt-2 h-7 w-24" />
			) : (
				<p className={cn("mt-1 text-xl font-semibold text-high-emphasis", valueClassName)}>
					{value}
				</p>
			)}
		</div>
	);
}
