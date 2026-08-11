import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import type { Market } from "@/types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ASSET_NAMES, COIN_LOGOS, MARKET_STATS } from "@/utils/misc";
import { api } from "@/lib/api";

interface MarketHeaderProps {
	market: string;
}

export function MarketHeader({ market }: MarketHeaderProps) {
	const navigate = useNavigate();
	const [markets, setMarkets] = useState<Market[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [base, quote] = market.split("_") as [string, string];

	useEffect(() => {
		api
			.getMarkets()
			.then((res) => setMarkets(res.data ?? []))
			.catch(() => {});
	}, []);

	const filteredMarkets = markets.filter((m) => {
		const symbolStr = m.symbol.toLowerCase().replace("_", "/");
		const nameStr = (m.name || "").toLowerCase();
		const query = searchQuery.toLowerCase();
		return symbolStr.includes(query) || nameStr.includes(query);
	});

	const currentStats = MARKET_STATS[market];

	return (
		<div className="flex flex-wrap items-center justify-between bg-card rounded-xl border border-border/40 px-5 py-3 gap-4 shrink-0 select-none">
			<div className="flex items-center gap-6 min-w-0">
				<Popover
					onOpenChange={(open) => {
						if (!open) setSearchQuery("");
					}}
				>
					<PopoverTrigger asChild>
						<button className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1 text-left cursor-pointer transition-colors hover:bg-muted/40">
							{COIN_LOGOS[base] ? (
								<img src={COIN_LOGOS[base]} alt={base} className="size-8 object-contain shrink-0" />
							) : (
								<div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
									{base[0]}
								</div>
							)}

							<div className="flex flex-col gap-1">
								<span className="flex items-center gap-1.5 text-md font-bold text-high-emphasis tracking-tight leading-none">
									{base}/{quote}
								</span>
								<span className="text-[11px] text-low-emphasis leading-none">
									{ASSET_NAMES[base] ?? base} · {quote}
								</span>
							</div>

							<ChevronDown className="size-4 text-muted-foreground/80 ml-1 shrink-0" />
						</button>
					</PopoverTrigger>

					<PopoverContent
						align="start"
						className="w-84 p-1 border-border/40 rounded-xl overflow-hidden shadow-lg"
					>
						<div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/20 bg-muted/10">
							<Search className="size-4 text-low-emphasis shrink-0" />
							<input
								type="text"
								placeholder="Search markets"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="flex-1 bg-transparent text-sm outline-none text-high-emphasis placeholder:text-muted-foreground/40"
							/>
						</div>

						<div className="flex items-center justify-between px-4 pt-3 pb-1">
							<span className="text-xs text-medium-emphasis">Markets</span>
							<span className="text-[10px] text-low-emphasis">{markets.length} pairs</span>
						</div>

						<div className="max-h-80 overflow-y-auto p-1.5">
							{filteredMarkets.length === 0 ? (
								<div className="py-8 text-center text-xs text-low-emphasis">No markets found</div>
							) : (
								filteredMarkets.map((m) => {
									const [b, q] = m.symbol.split("_") as [string, string];
									const isCurrent = m.symbol === market;
									const stats = MARKET_STATS[m.symbol];

									return (
										<button
											key={m.id}
											onClick={() => {
												navigate(`/trade/${m.symbol}`);
											}}
											className={cn(
												"flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
												isCurrent ? "bg-l3" : "hover:bg-muted/30",
											)}
										>
											{COIN_LOGOS[b] ? (
												<img
													src={COIN_LOGOS[b]}
													alt={b}
													className="size-7 object-contain shrink-0"
												/>
											) : (
												<div className="size-7 rounded-lg bg-l3 text-high-emphasis flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
													{b[0]}
												</div>
											)}

											<div className="min-w-0 flex-1">
												<span
													className={cn("text-sm font-semibold tracking-tight text-high-emphasis")}
												>
													{b}/{q}
												</span>
												<p className="truncate text-[11px] text-low-emphasis">
													{ASSET_NAMES[b] ?? b}
												</p>
											</div>

											{stats ? (
												<div className="flex flex-col items-end gap-0.5">
													<span className="text-xs font-medium text-high-emphasis">
														{stats.price}
													</span>
													<span
														className={cn(
															"text-[11px] leading-none",
															stats.change === "0.00%"
																? "text-medium-emphasis"
																: stats.isUp
																	? "text-green-text"
																	: "text-red-text",
														)}
													>
														{stats.change}
													</span>
												</div>
											) : null}
										</button>
									);
								})
							)}
						</div>
					</PopoverContent>
				</Popover>

				{currentStats ? (
					<>
						<div className="hidden sm:block h-8 w-px bg-border/40" />
						<div className="hidden sm:flex flex-col gap-0.5">
							<span className="text-sm font-bold text-high-emphasis leading-none">
								{currentStats.price}
							</span>
							<span
								className={cn(
									"text-xs leading-none",
									currentStats.change === "0.00%"
										? "text-medium-emphasis"
										: currentStats.isUp
											? "text-green-text"
											: "text-red-text",
								)}
							>
								{currentStats.change}
							</span>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
