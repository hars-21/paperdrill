import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Page, PageContent, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { AssetIcon } from "@/components/icons/asset-icon";
import { formatPrice, formatVolume, formatChange } from "@/utils/format";

const TABS = ["Spot"];

export function MarketsPage() {
	const { markets, loading: marketsLoading } = useMarkets();
	const { tickers, loading, error } = useTickers();
	const [activeTab, setActiveTab] = useState("Spot");
	const navigate = useNavigate();

	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Spot Markets</h1>
					<p className="text-xs text-medium-emphasis mt-1">
						Zero-fee sandbox paper trading playground on digital assets
					</p>
				</div>
			</PageHeader>

			<PageContent>
				<div className="flex flex-col flex-1 gap-3 rounded-xl border border-border/40 bg-card p-4">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
							{TABS.map((tab) => (
								<Button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`flex justify-center flex-col cursor-pointer rounded-lg py-1 whitespace-nowrap text-[13px] font-semibold px-3 h-8 transition-colors ${
										activeTab === tab
											? "text-high-emphasis bg-muted"
											: "text-medium-emphasis hover:text-high-emphasis"
									}`}
								>
									{tab}
								</Button>
							))}
						</div>
					</div>

					{error ? (
						<div className="py-8 text-center">
							<p className="text-sm text-destructive font-medium">Failed to load markets</p>
							<p className="text-xs text-medium-emphasis mt-1">{error}</p>
						</div>
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
										? Array.from({ length: 4 }).map((_, i) => (
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
													<TableCell className="text-right">
														<Skeleton className="h-4 w-14 ml-auto" />
													</TableCell>
													<TableCell className="text-right">
														<Skeleton className="h-4 w-12 ml-auto" />
													</TableCell>
													<TableCell className="text-right">
														<Skeleton className="h-7 w-16 ml-auto" />
													</TableCell>
												</TableRow>
											))
										: markets.map((m) => {
												const ticker = tickers[m.symbol];
												const change = formatChange(ticker?.priceChangePercent);

												return (
													<TableRow
														key={m.id}
														className="group cursor-pointer"
														onClick={() => navigate(`/trade/${m.symbol}`)}
													>
														<TableCell className="whitespace-nowrap">
															<div className="flex items-center gap-3">
																<div className="overflow-hidden rounded-full size-8">
																	<AssetIcon asset={m.baseAsset} />
																</div>
																<div className="flex items-center gap-1.5">
																	<div className="text-high-emphasis text-base">{m.baseAsset}</div>
																	<div className="text-low-emphasis text-sm">{m.name}</div>
																</div>
															</div>
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
																variant="ghost"
																size="sm"
																className="opacity-0 group-hover:opacity-100 transition-opacity text-medium-emphasis"
																onClick={(e) => {
																	e.stopPropagation();
																	navigate(`/trade/${m.symbol}`);
																}}
															>
																Trade
																<ArrowUpRight className="size-3.5" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</PageContent>
		</Page>
	);
}
