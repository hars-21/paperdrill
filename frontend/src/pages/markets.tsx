import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingUp, Activity, ShieldCheck } from "lucide-react";
import type { Market } from "@/types";
import { ASSET_NAMES, COIN_LOGOS } from "@/utils/misc";
import { api } from "@/lib/api";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Page, PageHeader, PageContent } from "@/components/ui/page";

const MARKET_STATS: Record<string, { price: string; change: string; isUp: boolean; volume: string }> = {
	"BTC_USD": { price: "$65,425.50", change: "+2.45%", isUp: true, volume: "$452.8M" },
	"ETH_USD": { price: "$3,412.20", change: "-1.80%", isUp: false, volume: "$284.1M" },
	"SOL_USD": { price: "$142.10", change: "+5.12%", isUp: true, volume: "$95.4M" },
	"USD_USD": { price: "$1.00", change: "0.00%", isUp: true, volume: "$0.0M" },
};

export function MarketsPage() {
	const [markets, setMarkets] = useState<Market[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api
			.getMarkets()
			.then((res) => setMarkets(res.data ?? []))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Spot Markets</h1>
					<p className="text-xs text-muted-foreground mt-1">
						Zero-fee sandbox paper trading playground on digital assets
					</p>
				</div>
			</PageHeader>

			<PageContent className="animate-fade-in max-w-6xl">
				{/* Stats Cards Overview */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
					<div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
						<div className="absolute right-3 top-3 text-muted-foreground/10 group-hover:text-muted-foreground/15 transition-colors">
							<TrendingUp className="size-10 stroke-[1.5]" />
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
								24h Global Volume
							</span>
							<h3 className="text-xl font-bold font-mono text-high-emphasis mt-2">
								$832,300,000
							</h3>
						</div>
						<span className="text-[10px] text-success font-semibold mt-4 flex items-center gap-1">
							<span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
							+4.12% active change
						</span>
					</div>
					<div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
						<div className="absolute right-3 top-3 text-muted-foreground/10 group-hover:text-muted-foreground/15 transition-colors">
							<Activity className="size-10 stroke-[1.5]" />
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
								Matching Status
							</span>
							<h3 className="text-xl font-bold text-high-emphasis mt-2">
								Operational
							</h3>
						</div>
						<span className="text-[10px] text-success font-semibold mt-4 flex items-center gap-1">
							<span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
							All engines running
						</span>
					</div>
					<div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
						<div className="absolute right-3 top-3 text-muted-foreground/10 group-hover:text-muted-foreground/15 transition-colors">
							<ShieldCheck className="size-10 stroke-[1.5]" />
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
								Sandbox Mode
							</span>
							<h3 className="text-xl font-bold text-high-emphasis mt-2">
								Paper Trading
							</h3>
						</div>
						<span className="text-[10px] text-muted-foreground/60 font-semibold mt-4">
							Unlimited test balances available
						</span>
					</div>
				</div>

				{loading ? (
					<div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="px-6 py-3.5">Asset Pair</TableHead>
									<TableHead className="px-6 py-3.5">Name</TableHead>
									<TableHead className="px-6 py-3.5 text-right">Last Price</TableHead>
									<TableHead className="px-6 py-3.5 text-right">24h Change</TableHead>
									<TableHead className="px-6 py-3.5 text-right">24h Volume</TableHead>
									<TableHead className="px-6 py-3.5">Market Type</TableHead>
									<TableHead className="px-6 py-3.5">Status</TableHead>
									<TableHead className="px-6 py-3.5 text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 4 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell className="px-6 py-4.5 font-sans">
											<div className="flex items-center gap-2.5">
												<Skeleton className="h-8 w-8 rounded-lg" />
												<div className="space-y-1.5">
													<Skeleton className="h-4 w-16" />
													<Skeleton className="h-3 w-10" />
												</div>
											</div>
										</TableCell>
										<TableCell className="px-6 py-4.5 font-sans">
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell className="px-6 py-4.5 text-right font-sans">
											<Skeleton className="h-4 w-16 ml-auto" />
										</TableCell>
										<TableCell className="px-6 py-4.5 text-right font-sans">
											<Skeleton className="h-4 w-12 ml-auto" />
										</TableCell>
										<TableCell className="px-6 py-4.5 text-right font-sans">
											<Skeleton className="h-4 w-14 ml-auto" />
										</TableCell>
										<TableCell className="px-6 py-4.5 font-sans">
											<Skeleton className="h-4 w-12" />
										</TableCell>
										<TableCell className="px-6 py-4.5 font-sans">
											<Skeleton className="h-4 w-16" />
										</TableCell>
										<TableCell className="px-6 py-4.5 text-right font-sans">
											<Skeleton className="h-8 w-20 ml-auto" />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<>
						<div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="px-6 py-3.5">Asset Pair</TableHead>
										<TableHead className="px-6 py-3.5">Name</TableHead>
										<TableHead className="px-6 py-3.5 text-right">Last Price</TableHead>
										<TableHead className="px-6 py-3.5 text-right">24h Change</TableHead>
										<TableHead className="px-6 py-3.5 text-right">24h Volume</TableHead>
										<TableHead className="px-6 py-3.5">Market Type</TableHead>
										<TableHead className="px-6 py-3.5">Status</TableHead>
										<TableHead className="px-6 py-3.5 text-right">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{markets.map((m) => {
										const [base, quote] = m.symbol.split("_") as [string, string];
										const assetName = ASSET_NAMES[base] || m.name || base;
										const stats = MARKET_STATS[m.symbol] || {
											price: "—",
											change: "0.00%",
											isUp: true,
											volume: "—",
										};

										return (
											<TableRow key={m.id}>
												<TableCell className="px-6 py-4.5 font-sans">
													<div className="flex items-center gap-2.5">
														{COIN_LOGOS[base] ? (
															<img
																src={COIN_LOGOS[base]}
																alt={base}
																className="h-8 w-8 object-contain shrink-0"
															/>
														) : (
															<div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs tracking-wider uppercase shrink-0">
																{base[0]}
															</div>
														)}
														<div>
															<span className="font-bold text-high-emphasis text-sm">
																{base}/{quote}
															</span>
															<span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
																{m.symbol}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="px-6 py-4.5 text-muted-foreground font-medium font-sans">
													{assetName}
												</TableCell>
												<TableCell className="px-6 py-4.5 text-right font-mono font-medium text-high-emphasis">
													{stats.price}
												</TableCell>
												<TableCell
													className={`px-6 py-4.5 text-right font-mono font-bold ${
														stats.change === "0.00%"
															? "text-muted-foreground"
															: stats.isUp
																? "text-success"
																: "text-destructive"
													}`}
												>
													{stats.change}
												</TableCell>
												<TableCell className="px-6 py-4.5 text-right font-mono text-muted-foreground">
													{stats.volume}
												</TableCell>
												<TableCell className="px-6 py-4.5 font-sans">
													<span className="px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-bold uppercase tracking-wider border border-border/10">
														Spot
													</span>
												</TableCell>
												<TableCell className="px-6 py-4.5 font-sans">
													<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-success/10 text-success text-[10px] font-semibold">
														<span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
														Active
													</span>
												</TableCell>
												<TableCell className="px-6 py-4.5 text-right font-sans">
													<Link to={`/trade/${m.symbol}`}>
														<Button
															size="sm"
															variant="ghost"
															className="hover:bg-primary hover:text-white text-xs font-semibold gap-1 px-3"
														>
															Trade <ArrowRight className="size-3.5" />
														</Button>
													</Link>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>

						<p className="text-center text-xs text-muted-foreground/40 mt-8">
							More spot markets coming soon. All trading assets are simulated sandbox balances.
						</p>
					</>
				)}
			</PageContent>
		</Page>
	);
}
