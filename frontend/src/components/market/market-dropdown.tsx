import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AssetIcon } from "../icons/asset-icon";
import type { Market, Ticker } from "@/types";
import { formatChange, formatPrice } from "@/utils/format";

interface MarketDropdownProps {
	symbol: string;
	base: string;
	quote: string;
	markets: Market[];
	tickers: Record<string, Ticker>;
}

export function MarketDropdown({ symbol, base, quote, markets, tickers }: MarketDropdownProps) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const filteredMarkets = markets.filter((m) => {
		const symbolStr = m.symbol.toLowerCase().replace("_", "/");
		const nameStr = (m.name || "").toLowerCase();
		const query = searchQuery.toLowerCase();
		return symbolStr.includes(query) || nameStr.includes(query);
	});

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setSearchQuery("");
			}}
		>
			<PopoverTrigger asChild>
				<button className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1 text-left cursor-pointer transition-colors hover:bg-muted/40">
					<AssetIcon asset={base} className="size-6 shrink-0" />

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
				className="w-[calc(100vw-2rem)] max-w-84 overflow-hidden rounded-xl border-border/40 p-1 shadow-lg"
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
				</div>

				<div className="max-h-80 overflow-y-auto p-1.5">
					{filteredMarkets.length === 0 ? (
						<div className="py-8 text-center text-xs text-low-emphasis">No markets found</div>
					) : (
						filteredMarkets.map((m) => {
							const base = m.baseAsset ?? m.symbol.split("_")[0] ?? m.symbol;
							const quote = m.quoteAsset ?? m.symbol.split("_")[1] ?? "USD";
							const isCurrent = m.symbol === symbol;
							const mTicker = tickers[m.symbol];
							const mChange = formatChange(mTicker?.priceChangePercent);

							return (
								<button
									key={m.id}
									onClick={() => {
										setOpen(false);
										navigate(`/trade/${m.symbol}`);
									}}
									className={cn(
										"flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
										isCurrent ? "bg-l3" : "hover:bg-muted/30",
									)}
								>
									<AssetIcon asset={base} className="size-6 shrink-0" />
									<div className="min-w-0 flex-1">
										<span className="text-sm font-semibold tracking-tight text-high-emphasis">
											{base}/{quote}
										</span>
										<p className="truncate text-[11px] text-low-emphasis">{m.name}</p>
									</div>

									{mTicker ? (
										<div className="flex flex-col items-end gap-0.5">
											<span className="text-xs font-medium text-high-emphasis">
												{formatPrice(mTicker.lastPrice, m.pricePrecision)}
											</span>
											<span
												className={cn(
													"text-[11px] leading-none",
													mChange.isUp ? "text-green-text" : "text-red-text",
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
	);
}
