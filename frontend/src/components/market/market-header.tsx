import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import type { Market } from "@/types";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { COIN_LOGOS } from "@/utils/misc";
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
			.catch((err) => {
				console.error("Failed to load markets for header:", err);
			});
	}, []);

	const filteredMarkets = markets.filter((m) => {
		const symbolStr = m.symbol.toLowerCase().replace("_", "/");
		const nameStr = (m.name || "").toLowerCase();
		const query = searchQuery.toLowerCase();
		return symbolStr.includes(query) || nameStr.includes(query);
	});

	return (
		<div className="flex flex-wrap items-center justify-between bg-card rounded-xl border border-border/40 px-5 py-3 shadow-sm gap-4 shrink-0 select-none">
			<div className="flex items-center gap-4">
				<DropdownMenu
					onOpenChange={(open) => {
						if (!open) setSearchQuery("");
					}}
				>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="flex items-center gap-3 px-3.5 py-1.5 text-left">
							{COIN_LOGOS[base] ? (
								<img src={COIN_LOGOS[base]} alt={base} className="size-8 object-contain shrink-0" />
							) : (
								<div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
									{base[0]}
								</div>
							)}
							<div className="flex flex-col">
								<span className="text-md font-bold text-high-emphasis tracking-tight leading-none">
									{base}/{quote}
								</span>
							</div>
							<ChevronDown className="size-4 text-muted-foreground/80 ml-1 shrink-0" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-64 border-border/40 p-0 overflow-hidden bg-popover rounded-xl shadow-lg"
					>
						<div
							className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20 sticky top-0 bg-popover z-10"
							onKeyDown={(e) => e.stopPropagation()}
						>
							<Search className="size-3.5 text-muted-foreground/60 shrink-0" />
							<input
								type="text"
								placeholder="Search markets"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="flex-1 bg-transparent text-xs outline-none text-high-emphasis placeholder:text-muted-foreground/40 border-0 p-0 focus:ring-0 focus:outline-none"
							/>
						</div>

						<DropdownMenuLabel className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
							Spot Markets
						</DropdownMenuLabel>

						<div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
							{filteredMarkets.length === 0 ? (
								<div className="text-center py-4 text-xs text-muted-foreground/60">
									No markets found
								</div>
							) : (
								filteredMarkets.map((m) => {
									const [b, q] = m.symbol.split("_") as [string, string];
									const isCurrent = m.symbol === market;

									return (
										<DropdownMenuItem
											key={m.id}
											onClick={() => navigate(`/trade/${m.symbol}`)}
											className={`cursor-pointer px-2.5 py-2 rounded-lg gap-2.5 flex items-center transition-colors ${
												isCurrent
													? "bg-primary/10 text-primary font-bold focus:bg-primary/15 focus:text-primary"
													: "hover:bg-muted/20 focus:bg-muted/15"
											}`}
										>
											<div className="flex items-center gap-2.5">
												{COIN_LOGOS[b] ? (
													<img
														src={COIN_LOGOS[b]}
														alt={b}
														className="size-5 object-contain shrink-0"
													/>
												) : (
													<div className="size-5 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] uppercase shrink-0">
														{b[0]}
													</div>
												)}
												<div className="flex flex-col">
													<span className="text-xs font-bold leading-tight">
														{b}/{q}
													</span>
													<span className="text-[9px] text-muted-foreground/60 leading-none">
														Spot
													</span>
												</div>
											</div>
										</DropdownMenuItem>
									);
								})
							)}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
