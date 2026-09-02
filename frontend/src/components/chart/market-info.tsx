import { useMarket } from "@/context/MarketContext";
import type { Ticker } from "@/types";
import { formatChange, formatPrice, formatQty } from "@/utils/format";

function increment(precision: number) {
	return (10 ** -precision).toFixed(precision);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex min-h-11 items-center justify-between gap-3 py-1.5 sm:gap-6">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium text-high-emphasis">{value}</span>
		</div>
	);
}

export function MarketInfo({ symbol, ticker }: { symbol: string; ticker: Ticker | null }) {
	const market = useMarket(symbol);
	if (!market) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Market information unavailable
			</div>
		);
	}
	const change = formatChange(ticker?.priceChangePercent);

	return (
		<div className="grid gap-x-10 px-3 py-3 sm:grid-cols-2 sm:px-5">
			<div>
				<InfoRow label="Market" value={`${market.baseAsset}/${market.quoteAsset}`} />
				<InfoRow label="Step size" value={increment(market.qtyPrecision)} />
				<InfoRow label="Tick size" value={increment(market.pricePrecision)} />
				<InfoRow
					label="Minimum order size"
					value={`${increment(market.qtyPrecision)} ${market.baseAsset}`}
				/>
				<InfoRow label="Maximum order size" value="–" />
			</div>
			<div>
				<InfoRow label="Last price" value={formatPrice(ticker?.lastPrice, market.pricePrecision)} />
				<InfoRow
					label="24h change"
					value={
						ticker
							? `${formatPrice(ticker.priceChange, market.pricePrecision)} (${change.text})`
							: "—"
					}
				/>
				<InfoRow label="24h high" value={formatPrice(ticker?.high, market.pricePrecision)} />
				<InfoRow label="24h low" value={formatPrice(ticker?.low, market.pricePrecision)} />
				<InfoRow
					label={`24h volume (${market.baseAsset})`}
					value={formatQty(ticker?.volume, market.qtyPrecision)}
				/>
			</div>
		</div>
	);
}
