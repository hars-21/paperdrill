import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Market } from "@/types";
import { ASSET_NAMES, COIN_LOGOS } from "@/utils/misc";
import { api } from "@/lib/api";
import { Page, PageContent, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";

const MARKET_STATS: Record<
	string,
	{ price: string; change: string; isUp: boolean; volume: string }
> = {
	BTC_USD: { price: "$65,425.50", change: "+2.45%", isUp: true, volume: "$452.8M" },
	ETH_USD: { price: "$3,412.20", change: "-1.80%", isUp: false, volume: "$284.1M" },
	SOL_USD: { price: "$142.10", change: "+5.12%", isUp: true, volume: "$95.4M" },
	USD_USD: { price: "$1.00", change: "0.00%", isUp: true, volume: "$0.0M" },
};

const TABS = ["Spot"];

export function MarketsPage() {
	const [markets, setMarkets] = useState<Market[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("Spot");

	useEffect(() => {
		api
			.getMarkets()
			.then((res) => setMarkets(res.data ?? []))
			.catch((err) => {
				console.error("Failed to load markets:", err);
				setError(err instanceof Error ? err.message : "Failed to load markets");
			})
			.finally(() => setLoading(false));
	}, []);

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
				<div className="flex flex-col flex-1 gap-3 rounded-xl border border-border/40 bg-card p-4 mx-6 my-6">
					<div className="flex flex-row">
						<div className="flex items-center flex-row relative min-w-0 flex-1">
							<div className="items-center justify-start flex-row flex gap-1 overflow-x-auto whitespace-nowrap">
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
										<TableHead className="w-[17%] text-right">24h Volume</TableHead>
										<TableHead className="w-[17%] text-right">24h Change</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{loading
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
												</TableRow>
											))
										: markets.map((m) => {
												const [quote, base] = m.symbol.split("_") as [string, string];
												const assetName = ASSET_NAMES[quote] || m.name || quote;
												const stats = MARKET_STATS[m.symbol] || {
													price: "—",
													change: "0.00%",
													isUp: true,
													volume: "—",
												};

												return (
													<TableRow key={m.id} className="group cursor-pointer">
														<TableCell className="whitespace-nowrap">
															<Link
																to={`/trade/${m.symbol}`}
																className="flex shrink whitespace-nowrap"
															>
																<div className="flex items-center gap-2.5">
																	<div
																		className="relative flex-none overflow-hidden rounded-full border border-border/60"
																		style={{ width: 32, height: 32 }}
																	>
																		{COIN_LOGOS[quote] ? (
																			<img
																				src={COIN_LOGOS[quote]}
																				alt={quote}
																				className="h-8 w-8 object-contain"
																			/>
																		) : (
																			<div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
																				{quote[0]}
																			</div>
																		)}
																	</div>
																	<div className="flex flex-col">
																		<div className="text-high-emphasis text-sm">{assetName}</div>
																		<div className="flex items-center text-medium-emphasis text-xs">
																			<span>{quote}</span>
																			<span>/{base}</span>
																		</div>
																	</div>
																</div>
															</Link>
														</TableCell>
														<TableCell className="text-right whitespace-nowrap">
															{stats.price}
														</TableCell>
														<TableCell className="text-right whitespace-nowrap">
															{stats.volume}
														</TableCell>
														<TableCell className="text-right whitespace-nowrap">
															<span
																className={
																	stats.change === "0.00%"
																		? "text-medium-emphasis"
																		: stats.isUp
																			? "text-green-text"
																			: "text-red-text"
																}
															>
																{stats.change}
															</span>
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
