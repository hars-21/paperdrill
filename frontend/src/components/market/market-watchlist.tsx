import { useNavigate } from "react-router-dom";
import type { Market, Ticker } from "@/types";
import { cn } from "@/lib/utils";
import { formatChange, formatPrice } from "@/utils/format";
import { AssetIcon } from "../icons/asset-icon";

type MarketWatchlistProps = {
	symbol: string;
	markets: Market[];
	tickers: Record<string, Ticker>;
};

export function MarketWatchlist({ symbol, markets, tickers }: MarketWatchlistProps) {
	const navigate = useNavigate();

	return (
		<div className="overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm">
			<div className="border-b border-border/40 px-3 py-2.5 text-sm font-semibold text-high-emphasis">Markets</div>
			<div className="p-1.5">
				{markets.map((market) => {
					const ticker = tickers[market.symbol];
					const change = formatChange(ticker?.priceChangePercent);
					return (
						<button
							key={market.symbol}
							type="button"
							onClick={() => market.symbol !== symbol && navigate(`/trade/${market.symbol}`)}
							className={cn(
								"flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/70",
								market.symbol === symbol && "bg-muted",
							)}
						>
							<AssetIcon asset={market.baseAsset} className="size-7 shrink-0" />
							<div className="min-w-0 flex-1">
								<div className="text-sm font-semibold text-high-emphasis">
									{market.baseAsset}<span className="font-normal text-medium-emphasis">/{market.quoteAsset}</span>
								</div>
							</div>
							<div className="text-right">
								<div className="text-sm font-medium tabular-nums text-high-emphasis">
									{ticker ? formatPrice(ticker.lastPrice, market.pricePrecision) : "—"}
								</div>
								<div className={cn("text-xs tabular-nums", ticker ? (change.isUp ? "text-green-text" : "text-red-text") : "text-medium-emphasis")}>
									{ticker ? change.text : "—"}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
