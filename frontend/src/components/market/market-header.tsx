import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useMarkets } from "@/context/MarketContext";
import { useTickers } from "@/hooks/use-tickers";
import { formatChange, formatPrice, formatQty } from "@/utils/format";
import { MarketDropdown } from "./market-dropdown";

export function MarketHeader({ symbol }: { symbol: string }) {
	const { markets } = useMarkets();
	const { tickers } = useTickers();
	const market = markets.find((m) => m.symbol === symbol);
	const ticker = tickers[symbol];
	const base = market?.baseAsset ?? symbol.split("_")[0] ?? symbol;
	const quote = market?.quoteAsset ?? symbol.split("_")[1] ?? "USD";
	const currentChange = formatChange(ticker?.priceChangePercent);
	const [priceDirection, setPriceDirection] = useState<"up" | "down">("up");
	const prevLastPriceRef = useRef<string | null>(null);

	useEffect(() => {
		const prev = prevLastPriceRef.current;
		prevLastPriceRef.current = ticker?.lastPrice ?? null;
		if (prev == null || ticker?.lastPrice == null) {
			setPriceDirection("up");
			return;
		}
		const cur = Number(ticker.lastPrice);
		const old = Number(prev);
		if (!Number.isFinite(cur) || !Number.isFinite(old) || cur === old || cur > old) {
			setPriceDirection("up");
		} else {
			setPriceDirection("down");
		}
	}, [ticker?.lastPrice]);

	return (
		<div className="flex flex-wrap items-center justify-between bg-card rounded-lg border border-border/40 px-5 py-3 gap-4 shrink-0 select-none">
			<div className="flex items-center gap-6 min-w-0">
				<MarketDropdown
					symbol={symbol}
					base={base}
					quote={quote}
					markets={markets}
					tickers={tickers}
				/>

				{ticker ? (
					<>
						<div className="hidden sm:block h-8 w-px bg-border" />
						<div className="hidden sm:flex flex-col gap-0.5">
							<div className="flex flex-wrap items-center gap-8 text-xs">
								<div>
									<span
										className={cn(
											"text-lg font-bold",
											priceDirection === "up" ? "text-green-text" : "text-red-text",
										)}
									>
										{formatPrice(ticker.lastPrice)}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground text-[10px]">24h Change</span>
									<span
										className={cn(
											"font-medium",
											currentChange.isUp ? "text-green-text" : "text-red-text",
										)}
									>
										{formatPrice(ticker.priceChange)} {currentChange.text}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground text-[10px]">24h High</span>
									<span className="font-medium text-high-emphasis">{formatPrice(ticker.high)}</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground text-[10px]">24h Low</span>
									<span className="font-medium text-high-emphasis">{formatPrice(ticker.low)}</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-muted-foreground text-[10px]">24h Vol ({base})</span>
									<span className="font-medium text-high-emphasis">
										{formatQty(ticker.volume, 2)}
									</span>
								</div>
								<div className="flex flex-col gap-1 text-[10px]">
									<span className="text-muted-foreground">24h Vol ({quote})</span>
									<span className="font-medium text-high-emphasis">
										{formatQty(ticker.quoteVolume, 2)}
									</span>
								</div>
							</div>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
