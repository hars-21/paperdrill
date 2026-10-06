import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AssetIcon, assetNames } from "@/components/icons/asset-icon";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/context/MarketContext";
import { useBalance } from "@/hooks/use-balance";
import { usePortfolio } from "@/hooks/use-portfolio";
import { getAssetColor } from "@/lib/asset-colors";
import { cn } from "@/lib/utils";
import type { PortfolioPosition } from "@/types";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";

type BalanceRow = PortfolioPosition & {
	precision: number;
	allocation: number | null;
	marketSymbol: string | null;
};

function allocationBackground(rows: BalanceRow[]) {
	let cursor = 0;
	const stops = rows
		.filter((row) => row.allocation !== null && row.allocation > 0)
		.map((row) => {
			const start = cursor;
			cursor = Math.min(100, cursor + (row.allocation ?? 0));
			return `${getAssetColor(row.asset)} ${start}% ${cursor}%`;
		});

	return stops.length ? `conic-gradient(${stops.join(", ")})` : "var(--l2)";
}

function HoldingRow({ row, quoteAsset }: { row: BalanceRow; quoteAsset: string }) {
	const tradePath = row.marketSymbol ? `/trade/${row.marketSymbol}` : "/markets";

	return (
		<div className="px-4 py-4 sm:px-5">
			<div className="flex items-start justify-between gap-4 lg:grid lg:grid-cols-[minmax(12rem,1.2fr)_minmax(10rem,.9fr)_minmax(8rem,.75fr)_minmax(8rem,.75fr)_minmax(10rem,.8fr)_auto] lg:items-center">
				<div className="flex min-w-0 items-center gap-3">
					<AssetIcon asset={row.asset} className="size-10 shrink-0" />
					<div className="min-w-0">
						<p className="font-semibold text-high-emphasis">{row.asset}</p>
						<p className="truncate text-xs text-medium-emphasis">
							{assetNames[row.asset] ?? row.asset}
						</p>
					</div>
				</div>

				<div className="shrink-0 text-right lg:text-left">
					<p className="font-semibold text-high-emphasis tabular-nums">
						{row.value ? `${formatPrice(row.value)} ${quoteAsset}` : "-"}
					</p>
					<p className="mt-1 text-xs text-medium-emphasis tabular-nums">
						{formatQty(row.total, row.precision)} {row.asset}
					</p>
				</div>

				<div className="hidden lg:block">
					<p className="text-sm font-medium text-high-emphasis tabular-nums">
						{formatQty(row.available, row.precision)}
					</p>
					<p className="mt-1 text-xs text-medium-emphasis">Available</p>
				</div>

				<div className="hidden lg:block">
					<p
						className={cn(
							"text-sm tabular-nums",
							Number(row.locked) > 0
								? "font-medium text-high-emphasis"
								: "text-medium-emphasis",
						)}
					>
						{formatQty(row.locked, row.precision)}
					</p>
					<p className="mt-1 text-xs text-medium-emphasis">Reserved</p>
				</div>

				<div className="hidden lg:block">
					<div className="flex items-center gap-3">
						<span className="w-12 text-sm font-medium text-high-emphasis tabular-nums">
							{row.allocation === null ? "-" : `${row.allocation.toFixed(1)}%`}
						</span>
						<div className="h-1 w-20 overflow-hidden rounded-full bg-l3/70">
							<div
								className="h-full rounded-full"
								style={{
									width: `${Math.min(100, row.allocation ?? 0)}%`,
									backgroundColor: getAssetColor(row.asset),
								}}
							/>
						</div>
					</div>
					<p className="mt-1 text-xs text-medium-emphasis">Allocation</p>
				</div>

				<Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
					<Link to={tradePath}>{row.marketSymbol ? "Trade" : "Markets"}</Link>
				</Button>
			</div>

			<div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/30 pt-3 lg:hidden">
				<div>
					<p className="text-[11px] text-medium-emphasis">Available</p>
					<p className="mt-1 truncate text-xs font-medium text-high-emphasis tabular-nums">
						{formatQty(row.available, row.precision)}
					</p>
				</div>
				<div>
					<p className="text-[11px] text-medium-emphasis">Reserved</p>
					<p className="mt-1 truncate text-xs font-medium text-high-emphasis tabular-nums">
						{formatQty(row.locked, row.precision)}
					</p>
				</div>
				<div className="text-right">
					<p className="text-[11px] text-medium-emphasis">Allocation</p>
					<p className="mt-1 text-xs font-medium text-high-emphasis tabular-nums">
						{row.allocation === null ? "-" : `${row.allocation.toFixed(1)}%`}
					</p>
				</div>
			</div>

			<Button asChild variant="ghost" size="sm" className="mt-3 w-full lg:hidden">
				<Link to={tradePath}>{row.marketSymbol ? `Trade ${row.asset}` : "Browse markets"}</Link>
			</Button>
		</div>
	);
}

function PortfolioLoading() {
	return (
		<>
			<section className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm">
				<div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,.8fr)]">
					<div className="p-5 sm:p-6">
						<Skeleton className="h-3 w-28" />
						<Skeleton className="mt-4 h-10 w-60 max-w-full" />
						<Skeleton className="mt-3 h-4 w-44" />
						<div className="mt-8 grid grid-cols-3 gap-5 border-t border-border/40 pt-5">
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className="space-y-2">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-5 w-28 max-w-full" />
								</div>
							))}
						</div>
					</div>
					<div className="flex items-center gap-5 border-t border-border/40 bg-l2/20 p-5 sm:p-6 xl:border-t-0 xl:border-l">
						<Skeleton className="size-32 shrink-0 rounded-full" />
						<div className="w-full space-y-3">
							{Array.from({ length: 3 }).map((_, index) => (
								<Skeleton key={index} className="h-3 w-full" />
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm">
				<div className="border-b border-border/40 px-4 py-4 sm:px-5">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="mt-2 h-3 w-52" />
				</div>
				<div className="divide-y divide-border/30">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className="flex items-center gap-4 px-4 py-5 sm:px-5">
							<Skeleton className="size-10 shrink-0 rounded-full" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="ml-auto h-4 w-32" />
						</div>
					))}
				</div>
			</section>
		</>
	);
}

export function PortfolioPage() {
	const { markets } = useMarkets();
	const { balances, loading: balanceLoading, error: balanceError } = useBalance();
	const { portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolio();
	const [hideZeroBalances, setHideZeroBalances] = useState(true);
	const loading = balanceLoading || portfolioLoading;

	const rows = useMemo<BalanceRow[]>(() => {
		const precisionFor = (asset: string) => {
			const market = markets.find(
				(item) => item.baseAsset === asset || item.quoteAsset === asset,
			);
			if (!market) return 4;
			return market.baseAsset === asset ? market.qtyPrecision : market.pricePrecision;
		};
		const marketSymbolFor = (asset: string) =>
			markets.find((market) => market.baseAsset === asset)?.symbol ?? null;

		if (portfolio) {
			const equity = Number(portfolio.equity);
			return portfolio.positions
				.map((position) => ({
					...position,
					precision: precisionFor(position.asset),
					allocation: equity > 0 ? (Number(position.value) / equity) * 100 : null,
					marketSymbol: marketSymbolFor(position.asset),
				}))
				.sort((left, right) =>
					left.asset === portfolio.quoteAsset
						? -1
						: right.asset === portfolio.quoteAsset
							? 1
							: Number(right.value) - Number(left.value),
				);
		}

		return Object.entries(balances ?? {})
			.map(([asset, balance]) => {
				const available = balance.available ?? "0";
				const locked = balance.locked ?? "0";
				return {
					asset,
					available,
					locked,
					total: String(Number(available) + Number(locked)),
					markPrice: "",
					value: "",
					precision: precisionFor(asset),
					allocation: null,
					marketSymbol: marketSymbolFor(asset),
				};
			})
			.sort((left, right) => (left.asset === "USD" ? -1 : right.asset === "USD" ? 1 : 0));
	}, [balances, markets, portfolio]);

	const fundedRows = useMemo(
		() => rows.filter((row) => Number(row.total) > 0 || Number(row.value) > 0),
		[rows],
	);
	const visibleRows = hideZeroBalances ? fundedRows : rows;
	const allocationRows = fundedRows.filter(
		(row) => row.allocation !== null && row.allocation > 0,
	);
	const allocationStyle = {
		background: allocationBackground(allocationRows),
	} satisfies CSSProperties;
	const pnl = Number(portfolio?.pnl ?? 0);
	const pnlClassName = pnl >= 0 ? "text-green-text" : "text-red-text";
	const quotePosition = portfolio?.positions.find(
		(position) => position.asset === portfolio.quoteAsset,
	);
	const quoteValue = Number(quotePosition?.value ?? 0);
	const marketExposure = Math.max(0, Number(portfolio?.equity ?? 0) - quoteValue);
	const lockedValue = portfolio?.positions.reduce(
		(total, position) => total + Number(position.locked) * Number(position.markPrice),
		0,
	);

	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">Portfolio</h1>
						<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
							Track your credits, market exposure and funds reserved by open orders.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button asChild variant="outline" size="sm">
							<Link to="/activity">View activity</Link>
						</Button>
						<Button asChild size="sm">
							<Link to="/markets">Trade</Link>
						</Button>
					</div>
				</header>

				{balanceError || portfolioError ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						Portfolio valuation is temporarily unavailable. Balances already loaded are still shown.
					</InlineNotice>
				) : null}

				{loading ? (
					<PortfolioLoading />
				) : (
					<>
						<section
							className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
							aria-labelledby="portfolio-value-title"
						>
							{portfolio?.partial ? (
								<InlineNotice>
									Some market prices are unavailable, so the displayed value may be incomplete.
								</InlineNotice>
							) : null}
							<div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,.8fr)]">
								<div className="p-5 sm:p-6">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<p id="portfolio-value-title" className="text-sm text-medium-emphasis">
											Total portfolio value
										</p>
										{portfolio ? (
											<p className="text-xs text-low-emphasis">
												Updated {formatDateTime(portfolio.asOf)}
											</p>
										) : null}
									</div>

									<p className="mt-3 text-3xl font-semibold tracking-tight text-high-emphasis tabular-nums sm:text-4xl">
										{portfolio
											? `${formatPrice(portfolio.equity)} ${portfolio.quoteAsset}`
											: "Unavailable"}
									</p>

									{portfolio ? (
										<div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
											<p className={cn("text-sm font-semibold tabular-nums", pnlClassName)}>
												{pnl > 0 ? "+" : ""}{formatPrice(portfolio.pnl)} {portfolio.quoteAsset}
											</p>
											<p className={cn("text-sm tabular-nums", pnlClassName)}>
												{pnl > 0 ? "+" : ""}{portfolio.pnlPercent}%
											</p>
											<p className="text-xs text-medium-emphasis">
												Since {formatDateTime(portfolio.baselineAt)}
											</p>
										</div>
									) : null}

									<div className="mt-8 grid grid-cols-1 gap-4 border-t border-border/40 pt-5 sm:grid-cols-3 sm:gap-5">
										<div>
											<p className="text-xs text-medium-emphasis">Available cash</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{quotePosition && portfolio
													? `${formatPrice(quotePosition.available)} ${portfolio.quoteAsset}`
													: "Unavailable"}
											</p>
										</div>
										<div>
											<p className="text-xs text-medium-emphasis">Market exposure</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{portfolio
													? `${formatPrice(marketExposure)} ${portfolio.quoteAsset}`
													: "Unavailable"}
											</p>
										</div>
										<div>
											<p className="text-xs text-medium-emphasis">In open orders</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{portfolio && lockedValue !== undefined
													? `${formatPrice(lockedValue)} ${portfolio.quoteAsset}`
													: "Unavailable"}
											</p>
										</div>
									</div>
								</div>

								<div className="border-t border-border/40 bg-l2/20 p-5 sm:p-6 xl:border-t-0 xl:border-l">
									<div>
										<h2 className="text-sm font-semibold text-high-emphasis">Allocation</h2>
										<p className="mt-1 text-xs text-medium-emphasis">Current value by asset.</p>
									</div>

									{allocationRows.length ? (
										<div className="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
											<div
												className="relative size-36 shrink-0 rounded-full"
												style={allocationStyle}
												role="img"
												aria-label="Portfolio allocation by asset"
											>
												<div className="absolute inset-5 flex items-center justify-center rounded-full border border-border/50 bg-l1 text-center shadow-sm">
													<div>
														<p className="text-xl font-semibold text-high-emphasis tabular-nums">
															{allocationRows.length}
														</p>
														<p className="text-[11px] text-medium-emphasis">
															{allocationRows.length === 1 ? "asset" : "assets"}
														</p>
													</div>
												</div>
											</div>

											<div className="w-full min-w-0 space-y-3">
												{allocationRows.map((row) => (
													<div key={row.asset} className="flex items-center gap-3">
														<span
															className="size-2 shrink-0 rounded-full"
															style={{
																backgroundColor: getAssetColor(row.asset),
															}}
														/>
														<span className="min-w-0 flex-1 truncate text-xs font-medium text-high-emphasis">
															{row.asset}
														</span>
														<span className="text-xs text-medium-emphasis tabular-nums">
															{row.allocation?.toFixed(1)}%
														</span>
													</div>
												))}
											</div>
										</div>
									) : (
										<p className="mt-8 text-sm text-medium-emphasis">
											Allocation appears after your account holds funded assets.
										</p>
									)}
								</div>
							</div>
						</section>

						<section
							className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
							aria-labelledby="holdings-title"
						>
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-5">
								<div>
									<h2 id="holdings-title" className="text-sm font-semibold text-high-emphasis">
										Holdings
									</h2>
									<p className="mt-1 text-xs text-medium-emphasis">
										Available funds can trade now. Reserved funds are held by open orders.
									</p>
								</div>
								{rows.length !== fundedRows.length ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setHideZeroBalances((current) => !current)}
										className="text-medium-emphasis"
									>
										{hideZeroBalances ? "Show zero balances" : "Hide zero balances"}
									</Button>
								) : null}
							</div>

							{visibleRows.length ? (
								<div className="divide-y divide-border/30">
									{visibleRows.map((row) => (
										<HoldingRow
											key={row.asset}
											row={row}
											quoteAsset={portfolio?.quoteAsset ?? "USD"}
										/>
									))}
								</div>
							) : (
								<div className="flex min-h-52 items-center justify-center px-6 py-10 text-center">
									<div className="max-w-sm">
										<p className="text-sm font-semibold text-high-emphasis">No funded balances</p>
										<p className="mt-1.5 text-sm leading-6 text-medium-emphasis">
											Your credits and traded assets will appear here.
										</p>
										<Button asChild size="sm" className="mt-4">
											<Link to="/markets">Browse markets</Link>
										</Button>
									</div>
								</div>
							)}
						</section>
					</>
				)}
			</PageContent>
		</Page>
	);
}
