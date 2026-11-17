import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AssetIcon, assetNames } from "@/components/icons/asset-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackState, InlineNotice } from "@/components/ui/feedback-state";
import { Page, PageContent } from "@/components/ui/page";
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
import { usePortfolioPosition, usePortfolioPositionEvents } from "@/hooks/use-portfolio";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";

function num(value: string | null | undefined) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function signedMoney(value: string | null | undefined, precision = 2) {
	const parsed = num(value);
	if (parsed == null) return "—";
	return `${parsed > 0 ? "+" : ""}${formatPrice(value, precision)}`;
}

function signedPercent(value: string | null | undefined) {
	const parsed = num(value);
	if (parsed == null) return "—";
	return `${parsed > 0 ? "+" : ""}${parsed.toFixed(2)}%`;
}

function toneFor(value: string | number | null | undefined) {
	const parsed = num(typeof value === "number" ? String(value) : value);
	if (parsed == null || parsed === 0) return "text-medium-emphasis";
	return parsed > 0 ? "text-green-text" : "text-red-text";
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-3.5 text-sm">
			<span className="text-medium-emphasis">{label}</span>
			<span className="text-right font-medium text-high-emphasis tabular-nums">{value}</span>
		</div>
	);
}

export function PortfolioAssetPage() {
	const { asset: assetParam } = useParams();
	const asset = assetParam?.toUpperCase() ?? "";
	const { markets } = useMarkets();
	const [page, setPage] = useState(1);
	const {
		detail,
		loading,
		error,
	} = usePortfolioPosition(asset || undefined);
	const {
		events,
		loading: eventsLoading,
		fetching: eventsFetching,
		error: eventsError,
	} = usePortfolioPositionEvents(asset || undefined, page);

	useEffect(() => {
		setPage(1);
	}, [asset]);

	const precision = useMemo(() => {
		const qty = new Map<string, number>();
		const price = new Map<string, number>();

		for (const market of markets) {
			qty.set(market.baseAsset, market.qtyPrecision);
			price.set(market.baseAsset, market.pricePrecision);
			price.set(market.quoteAsset, market.pricePrecision);
		}

		return {
			qty: (value: string) => qty.get(value) ?? 4,
			price: (value: string) => price.get(value) ?? 2,
		};
	}, [markets]);

	const quoteAsset = detail?.quoteAsset ?? "USD";
	const quotePrecision = precision.price(quoteAsset);
	const pricePrecision = detail?.symbol ? precision.price(detail.symbol.split("_")[0] ?? asset) : precision.price(asset);
	const qtyPrecision = precision.qty(asset);
	const position = detail?.position ?? null;
	const notFound = error instanceof ApiError && error.status === 404;

	const totalPnl =
		position == null
			? null
			: (num(position.realizedPnl) ?? 0) + (num(position.unrealizedPnl) ?? 0);

	return (
		<Page>
			<PageContent className="max-w-384 space-y-5">
				<nav className="flex items-center gap-1.5 text-xs text-medium-emphasis">
					<Link
						to="/portfolio"
						className="inline-flex items-center gap-1 rounded underline-offset-4 hover:text-high-emphasis hover:underline"
					>
						<ArrowLeft className="size-3.5" /> Portfolio
					</Link>
					<ChevronRight className="size-3 text-low-emphasis" />
					<span className="font-medium text-high-emphasis">{asset || "Asset"}</span>
				</nav>

				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex items-center gap-3">
						<AssetIcon asset={asset} className="size-11 shrink-0" />
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">
									{asset}
								</h1>
								<Badge variant="outline" className="uppercase">
									{detail?.symbol ?? `${asset}/${quoteAsset}`}
								</Badge>
								{position ? (
									<Badge variant={Number(position.qty) > 0 ? "success" : "secondary"}>
										{Number(position.qty) > 0 ? "Open" : "Closed"}
									</Badge>
								) : null}
							</div>
							<p className="mt-1 text-sm text-medium-emphasis">
								{assetNames[asset] ?? "Asset"} cost basis, PnL and trade ledger.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button asChild variant="outline" size="sm">
							<Link to="/portfolio">All holdings</Link>
						</Button>
						{detail?.symbol ? (
							<Button asChild size="sm">
								<Link to={`/trade/${detail.symbol}`}>
									Trade {asset} <ArrowUpRight />
								</Link>
							</Button>
						) : (
							<Button asChild size="sm">
								<Link to="/markets">Browse markets</Link>
							</Button>
						)}
					</div>
				</header>

				{notFound ? (
					<div className="rounded-xl border border-border/60 bg-l1">
						<FeedbackState
							title={`No position for ${asset}`}
							description="This asset has no recorded balance or trades on your account."
							action={
								<Button asChild size="sm">
									<Link to="/portfolio">Back to portfolio</Link>
								</Button>
							}
						/>
					</div>
				) : error ? (
					<InlineNotice tone="error" className="rounded-xl border border-red-text/20 bg-red-bg/20">
						Position details are temporarily unavailable.
					</InlineNotice>
				) : loading && !detail ? (
					<>
						<section className="rounded-xl border border-border/60 bg-l1 p-5 shadow-sm sm:p-6">
							<Skeleton className="h-3 w-28" />
							<Skeleton className="mt-4 h-10 w-56" />
							<div className="mt-8 grid gap-5 border-t border-border/40 pt-5 sm:grid-cols-3">
								{Array.from({ length: 3 }).map((_, index) => (
									<Skeleton key={index} className="h-12 w-full" />
								))}
							</div>
						</section>
						<Skeleton className="h-72 w-full rounded-xl" />
					</>
				) : detail && position ? (
					<>
						<section
							className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
							aria-labelledby="position-value-title"
						>
							{detail.partial ? (
								<InlineNotice>
									Some market prices are unavailable, so the displayed value may be incomplete.
								</InlineNotice>
							) : null}
							<div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.8fr)]">
								<div className="p-5 sm:p-6">
									<p
										id="position-value-title"
										className="text-sm text-medium-emphasis"
									>
										Position value
									</p>
									<p className="mt-3 text-3xl font-semibold tracking-tight text-high-emphasis tabular-nums sm:text-4xl">
										{formatPrice(position.value, quotePrecision)} {quoteAsset}
									</p>
									<div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
										<span className="font-medium text-high-emphasis tabular-nums">
											{formatPrice(position.total, qtyPrecision)} {asset}
										</span>
										<span
											className={cn(
												"font-semibold tabular-nums",
												toneFor(totalPnl),
											)}
										>
											{signedMoney(totalPnl == null ? null : String(totalPnl), quotePrecision)}{" "}
											total PnL
										</span>
										<span className="text-xs text-medium-emphasis">
											Updated {formatDateTime(detail.asOf)}
										</span>
									</div>

									<div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-border/40 pt-5 sm:grid-cols-4">
										<div>
											<p className="text-xs text-medium-emphasis">Average cost</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{position.averageCost
													? `${formatPrice(position.averageCost, pricePrecision)} ${quoteAsset}`
													: "—"}
											</p>
										</div>
										<div>
											<p className="text-xs text-medium-emphasis">Mark price</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{position.markPrice
													? `${formatPrice(position.markPrice, pricePrecision)} ${quoteAsset}`
													: "—"}
											</p>
										</div>
										<div>
											<p className="text-xs text-medium-emphasis">Allocation</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{position.allocationPercent == null
													? "—"
													: `${Number(position.allocationPercent).toFixed(2)}%`}
											</p>
										</div>
										<div>
											<p className="text-xs text-medium-emphasis">Trades</p>
											<p className="mt-1.5 text-sm font-semibold text-high-emphasis tabular-nums">
												{position.tradeCount ?? detail.trading.fills}
											</p>
										</div>
									</div>
								</div>

								<div className="border-t border-border/40 bg-l2/20 p-5 sm:p-6 xl:border-t-0 xl:border-l">
									<h2 className="text-sm font-semibold text-high-emphasis">PnL breakdown</h2>
									<div className="mt-4 divide-y divide-border/40">
										<DetailRow
											label="Unrealised"
											value={
												<span className={toneFor(position.unrealizedPnl)}>
													{signedMoney(position.unrealizedPnl, quotePrecision)}
													{position.unrealizedPnlPercent
														? ` (${signedPercent(position.unrealizedPnlPercent)})`
														: ""}
												</span>
											}
										/>
										<DetailRow
											label="Realised"
											value={
												<span className={toneFor(position.realizedPnl)}>
													{signedMoney(position.realizedPnl, quotePrecision)}
												</span>
											}
										/>
										<DetailRow
											label="Total"
											value={
												<span
													className={cn("font-semibold", toneFor(totalPnl))}
												>
													{signedMoney(
														totalPnl == null ? null : String(totalPnl),
														quotePrecision,
													)}
												</span>
											}
										/>
										<DetailRow
											label="Cost basis"
											value={formatPrice(position.costBasis, quotePrecision)}
										/>
									</div>
								</div>
							</div>
						</section>

						<div className="grid gap-5 xl:grid-cols-2">
							<section className="rounded-xl border border-border/60 bg-l1 p-5 shadow-sm sm:p-6">
								<h2 className="text-sm font-semibold text-high-emphasis">Position</h2>
								<div className="mt-2 divide-y divide-border/40">
									<DetailRow
										label="Quantity"
										value={`${formatPrice(position.total, qtyPrecision)} ${asset}`}
									/>
									<DetailRow
										label="Available"
										value={formatQty(position.available, qtyPrecision)}
									/>
									<DetailRow
										label="Reserved"
										value={formatQty(position.locked, qtyPrecision)}
									/>
									<DetailRow
										label="Last buy"
										value={
											position.lastBuyPrice
												? `${formatPrice(position.lastBuyPrice, pricePrecision)} · ${formatDateTime(position.lastBuyAt ?? "")}`
												: "—"
										}
									/>
									<DetailRow
										label="Last sell"
										value={
											position.lastSellPrice
												? `${formatPrice(position.lastSellPrice, pricePrecision)} · ${formatDateTime(position.lastSellAt ?? "")}`
												: "—"
										}
									/>
								</div>
							</section>

							<section className="rounded-xl border border-border/60 bg-l1 p-5 shadow-sm sm:p-6">
								<h2 className="text-sm font-semibold text-high-emphasis">Trade activity</h2>
								<div className="mt-2 divide-y divide-border/40">
									<DetailRow label="Fills" value={detail.trading.fills} />
									<DetailRow
										label="Buys / sells"
										value={`${detail.trading.buys} / ${detail.trading.sells}`}
									/>
									<DetailRow
										label="Realised PnL"
										value={
											<span className={toneFor(detail.trading.realizedPnl)}>
												{signedMoney(detail.trading.realizedPnl, quotePrecision)}
											</span>
										}
									/>
									<DetailRow
										label="First trade"
										value={
											detail.trading.firstTradeAt
												? formatDateTime(detail.trading.firstTradeAt)
												: "—"
										}
									/>
									<DetailRow
										label="Last trade"
										value={
											detail.trading.lastTradeAt
												? formatDateTime(detail.trading.lastTradeAt)
												: "—"
										}
									/>
								</div>
							</section>
						</div>

						<section
							className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
							aria-labelledby="position-ledger-title"
						>
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-5">
								<div>
									<h2 id="position-ledger-title" className="text-sm font-semibold text-high-emphasis">
										Trade ledger
									</h2>
									<p className="mt-1 text-xs text-medium-emphasis">
										Running cost basis and realised PnL after each fill.
										{eventsFetching ? " Updating…" : ""}
									</p>
								</div>
								{events ? (
									<p className="text-xs text-medium-emphasis">
										{events.pagination.total}{" "}
										{events.pagination.total === 1 ? "fill" : "fills"}
									</p>
								) : null}
							</div>

							{eventsError ? (
								<InlineNotice tone="error">
									The trade ledger could not be loaded.
								</InlineNotice>
							) : null}

							{eventsLoading && !events ? (
								<div className="space-y-2 p-5">
									{Array.from({ length: 5 }).map((_, index) => (
										<Skeleton key={index} className="h-9 w-full" />
									))}
								</div>
							) : events && events.events.length === 0 ? (
								<FeedbackState
									title="No fills recorded"
									description="Trades for this asset will appear here with their running cost basis."
									className="min-h-52"
								/>
							) : events ? (
								<>
									<div className="overflow-x-auto">
										<Table className="min-w-[56rem]">
											<TableHeader>
												<TableRow className="hover:bg-transparent">
													<TableHead className="pl-5">Time</TableHead>
													<TableHead>Side</TableHead>
													<TableHead className="text-right">Price</TableHead>
													<TableHead className="text-right">Quantity</TableHead>
													<TableHead className="text-right">Notional</TableHead>
													<TableHead className="text-right">Cost basis after</TableHead>
													<TableHead className="pr-5 text-right">Realised PnL</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{events.events.map((event) => {
													const eventPricePrecision = precision.price(
														event.symbol.split("_")[0] ?? asset,
													);
													return (
														<TableRow key={event.id}>
															<TableCell className="pl-5 whitespace-nowrap text-xs text-medium-emphasis">
																{formatDateTime(event.occurredAt)}
															</TableCell>
															<TableCell>
																<Badge
																	variant={event.side === "BUY" ? "success" : "danger"}
																	className="w-12 justify-center"
																>
																	{event.side}
																</Badge>
															</TableCell>
															<TableCell className="text-right text-sm text-high-emphasis">
																{formatPrice(event.price, eventPricePrecision)}
															</TableCell>
															<TableCell className="text-right text-sm text-high-emphasis">
																{formatQty(event.qty, qtyPrecision)}
															</TableCell>
															<TableCell className="text-right text-sm text-high-emphasis">
																{formatPrice(event.quoteAmount, quotePrecision)}
															</TableCell>
															<TableCell className="text-right text-sm text-high-emphasis">
																{formatPrice(event.costBasisAfter, quotePrecision)}
															</TableCell>
															<TableCell
																className={cn(
																	"pr-5 text-right text-sm font-medium",
																	toneFor(event.realizedPnl),
																)}
															>
																{signedMoney(event.realizedPnl, quotePrecision)}
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>

									<div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3 sm:px-5">
										<p className="text-xs text-medium-emphasis">
											Page {events.pagination.page} of {events.pagination.totalPages}
										</p>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												disabled={!events.pagination.hasPreviousPage}
												onClick={() => setPage((current) => Math.max(1, current - 1))}
											>
												<ChevronLeft /> Previous
											</Button>
											<Button
												variant="outline"
												size="sm"
												disabled={!events.pagination.hasNextPage}
												onClick={() => setPage((current) => current + 1)}
											>
												Next <ChevronRight />
											</Button>
										</div>
									</div>
								</>
							) : null}
						</section>
					</>
				) : null}
			</PageContent>
		</Page>
	);
}
