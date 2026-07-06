import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
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
		<AppLayout>
			<div className="max-w-6xl mx-auto p-6 select-none animate-fade-in">
				<div className="mb-8">
					<h1 className="text-2xl font-bold tracking-tight">Spot Markets</h1>
					<p className="text-xs text-muted-foreground mt-1">
						Zero-fee sandbox paper trading playground on digital assets
					</p>
				</div>
				{loading ? (
					<div className="bg-card rounded-xl border border-border/40 shadow-xs overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="px-6 py-3.5">Asset Pair</TableHead>
									<TableHead className="px-6 py-3.5">Name</TableHead>
									<TableHead className="px-6 py-3.5">Market Type</TableHead>
									<TableHead className="px-6 py-3.5">Status</TableHead>
									<TableHead className="px-6 py-3.5 text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 3 }).map((_, i) => (
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
						<div className="bg-card rounded-xl border border-border/40 shadow-xs overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="px-6 py-3.5">Asset Pair</TableHead>
										<TableHead className="px-6 py-3.5">Name</TableHead>
										<TableHead className="px-6 py-3.5">Market Type</TableHead>
										<TableHead className="px-6 py-3.5">Status</TableHead>
										<TableHead className="px-6 py-3.5 text-right">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{markets.map((m) => {
										const [base, quote] = m.symbol.split("_") as [string, string];
										const assetName = ASSET_NAMES[base] || m.name || base;
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
													<Link to={`/market/${m.symbol}`}>
														<Button
															size="sm"
															variant="ghost"
															className="hover:bg-primary hover:text-white text-xs font-semibold gap-1 px-3"
														>
															Trade <ArrowRight className="h-3.5 w-3.5" />
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
			</div>
		</AppLayout>
	);
}
