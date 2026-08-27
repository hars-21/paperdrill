import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ASSET_NAMES, COIN_LOGOS } from "@/utils/misc";
import { useTickers } from "@/hooks/use-tickers";
import { formatPrice, formatChange } from "@/utils/market";

interface MarketHeaderProps {
	market: string;
}

export function MarketHeader({ market }: MarketHeaderProps) {
	const navigate = useNavigate();
	const { markets, tickers } = useTickers();
	const [searchQuery, setSearchQuery] = useState("");
	const [base, quote] = market.split("_") as [string, string];

	const filteredMarkets = markets.filter((m) => {
		const symbolStr = m.symbol.toLowerCase().replace("_", "/");
		const nameStr = (m.name || "").toLowerCase();
		const query = searchQuery.toLowerCase();
		return symbolStr.includes(query) || nameStr.includes(query);
	});

	const ticker = tickers[market];
	const currentChange = formatChange(ticker);

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
									const mTicker = tickers[m.symbol];
									const mChange = formatChange(mTicker);

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

											{mTicker ? (
												<div className="flex flex-col items-end gap-0.5">
													<span className="text-xs font-medium text-high-emphasis">
														{formatPrice(mTicker)}
													</span>
													<span
														className={cn(
															"text-[11px] leading-none",
															mChange.text === "0.00%"
																? "text-medium-emphasis"
																: mChange.isUp
																	? "text-green-text"
																	: "text-red-text",
														)}
													>
														{mChange.text}
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

				{ticker ? (
					<>
						<div className="hidden sm:block h-8 w-px bg-border" />
						<div className="hidden sm:flex flex-col gap-0.5">
							<div className="flex flex-wrap items-center gap-8 text-xs">
								<div>
									<span
										className={cn(
											"text-lg font-bold",
											currentChange.text === "0.00%"
												? "text-medium-emphasis"
												: currentChange.isUp
													? "text-green-text"
													: "text-red-text",
										)}
									>
										{formatPrice(ticker)}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground">24h Change</span>
									<span
										className={cn(
											"font-medium",
											currentChange.text === "0.00%"
												? "text-medium-emphasis"
												: currentChange.isUp
													? "text-green-text"
													: "text-red-text",
										)}
									>
										{ticker.priceChange}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground">24h High</span>
									<span className="font-medium text-high-emphasis">{ticker.high}</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground">24h Low</span>
									<span className="font-medium text-high-emphasis">{ticker.low}</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground">24h Volume</span>
									<span className="font-medium text-high-emphasis">{ticker.volume}</span>
								</div>
							</div>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
