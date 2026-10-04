import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useTickers } from "@/hooks/use-tickers";
import { useMarkets } from "@/context/MarketContext";
import { Page, PageContent, PageHeader, PageHeading } from "@/components/ui/page";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/icons/asset-icon";
import { formatPrice, formatVolume, formatChange } from "@/utils/format";

export function MarketsPage() {
	const { markets, loading: marketsLoading, error: marketsError, refresh: refreshMarkets } = useMarkets();
	const { tickers, loading, error: tickerError, refresh: refreshTickers } = useTickers();
	const error = marketsError ?? tickerError;

	return (
		<Page>
			<PageHeader>
				<PageHeading
					title="Spot Markets"
					description="Zero-fee sandbox paper trading playground on digital assets"
				/>
			</PageHeader>

			<PageContent>
				<Surface className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4">
					{error ? (
						<FeedbackState
							title="Failed to load markets"
							description={error}
							className="min-h-48"
							action={
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									void refreshMarkets();
									refreshTickers();
								}}
							>
								Try again
							</Button>
						}
						/>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-left">Name</TableHead>
										<TableHead className="w-[17%] text-right">Price</TableHead>
										<TableHead className="w-[17%] text-right hidden lg:table-cell">
											24h Volume
										</TableHead>
										<TableHead className="w-[17%] text-right">24h Change</TableHead>
										<TableHead className="w-20 text-right hidden lg:table-cell">
											<span className="sr-only">Trade</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{loading || marketsLoading
										? Array.from({ length: 3 }).map((_, i) => (
												<TableRow key={i}>
													<TableCell>
														<div className="flex items-center gap-2.5">
															<Skeleton className="h-8 w-8 rounded-full" />
															<Skeleton className="h-4 w-16" />
														</div>
													</TableCell>
													<TableCell className="text-right">
														<Skeleton className="h-4 w-20 ml-auto" />
													</TableCell>
													<TableCell className="hidden text-right lg:table-cell">
														<Skeleton className="ml-auto h-4 w-14" />
													</TableCell>
													<TableCell className="text-right">
														<Skeleton className="ml-auto h-4 w-12" />
													</TableCell>
													<TableCell className="hidden text-right lg:table-cell">
														<Skeleton className="ml-auto h-7 w-16" />
													</TableCell>
												</TableRow>
											))
										: markets.map((m) => {
												const ticker = tickers[m.symbol];
												const change = formatChange(ticker?.priceChangePercent);

												return (
													<TableRow key={m.id} className="group">
														<TableCell className="whitespace-nowrap">
															<Link
																to={`/trade/${m.symbol}`}
																className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
															>
																<div className="overflow-hidden rounded-full size-8">
																	<AssetIcon asset={m.baseAsset} />
																</div>
																<div className="flex items-center gap-1.5">
																	<div className="text-high-emphasis text-base">{m.baseAsset}</div>
																	<div className="hidden text-sm text-low-emphasis sm:block">{m.name}</div>
																</div>
															</Link>
														</TableCell>
														<TableCell className="text-right whitespace-nowrap">
															{formatPrice(ticker?.lastPrice, m.pricePrecision)}
														</TableCell>
														<TableCell className="text-right whitespace-nowrap hidden lg:table-cell">
															${formatVolume(ticker?.quoteVolume)}
														</TableCell>
														<TableCell className="text-right whitespace-nowrap">
															<span className={change.isUp ? "text-green-text" : "text-red-text"}>
																{change.text}
															</span>
														</TableCell>
														<TableCell className="text-right whitespace-nowrap hidden lg:table-cell">
															<Button
																asChild
																variant="ghost"
																size="sm"
																className="text-medium-emphasis"
															>
																<Link to={`/trade/${m.symbol}`}>
																	Trade
																	<ArrowUpRight className="size-3.5" />
																</Link>
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
								</TableBody>
							</Table>
						</div>
					)}
				</Surface>
			</PageContent>
		</Page>
	);
}
