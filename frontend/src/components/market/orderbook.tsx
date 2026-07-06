import { OrderbookSkeleton } from "./skeletons";

interface OrderbookProps {
	bids: Record<string, string>;
	asks: Record<string, string>;
	loading?: boolean;
	symbol: string;
}

const DISPLAY_ROWS = 8;

export function Orderbook({ bids, asks, loading, symbol }: OrderbookProps) {
	if (loading) {
		return <OrderbookSkeleton />;
	}

	const sortedAsks = Object.entries(asks)
		.map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }))
		.sort((a, b) => a.price - b.price);

	const sortedBids = Object.entries(bids)
		.map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }))
		.sort((a, b) => b.price - a.price);

	const bestAsk = sortedAsks.length > 0 ? sortedAsks[0]?.price : 0;
	const bestBid = sortedBids.length > 0 ? sortedBids[0]?.price : 0;
	const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
	const midPrice = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : 0;

	let accAsk = 0;
	const asksSliced = sortedAsks
		.map(({ price, qty }) => {
			accAsk += qty;
			return { price, qty, total: accAsk };
		})
		.slice(0, DISPLAY_ROWS);

	let accBid = 0;
	const bidsSliced = sortedBids
		.map(({ price, qty }) => {
			accBid += qty;
			return { price, qty, total: accBid };
		})
		.slice(0, DISPLAY_ROWS);

	return (
		<div className="flex h-full flex-col select-none relative">
			<div className="sticky top-0 z-10 flex border-b border-border/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 bg-card/90 backdrop-blur-xs shrink-0">
				<span className="flex-1">Price (USD)</span>
				<span className="flex-1 text-right">Size ({symbol.split("_")[0]})</span>
				<span className="flex-1 text-right">Total</span>
			</div>

			<div className="flex flex-1 flex-col justify-between min-h-0 py-1.5 overflow-hidden">
				<div className="flex flex-col-reverse justify-start flex-1 min-h-0">
					{asksSliced.length > 0 ? (
						asksSliced.map((ask, i) => (
							<div
								key={`ask-${i}`}
								className="flex py-1.5 px-4 text-xs font-mono hover:bg-muted/10 transition-colors"
							>
								<span className="flex-1 text-destructive/80 font-medium">
									{ask.price}
								</span>
								<span className="flex-1 text-right text-muted-foreground/80">
									{ask.qty}
								</span>
								<span className="flex-1 text-right text-muted-foreground/40">
									{ask.total.toFixed(4)}
								</span>
							</div>
						))
					) : (
						<div className="flex items-center justify-center flex-1 text-xs text-muted-foreground/40">
							No asks
						</div>
					)}
				</div>

				<div className="border-y border-border/40 bg-muted/10 px-4 py-2 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-1.5">
						<span className="font-mono text-sm font-semibold tracking-tight text-high-emphasis">
							{midPrice > 0 ? midPrice.toFixed(2) : "—"}
						</span>
						<span className="text-[10px] text-muted-foreground font-medium uppercase">USD</span>
					</div>
					<div className="text-[10px] text-muted-foreground font-medium">
						Spread:{" "}
						<span className="font-mono">
							{spread > 0 ? spread.toFixed(2) : "—"}
						</span>
					</div>
				</div>

				<div className="flex flex-col justify-start flex-1 min-h-0">
					{bidsSliced.length > 0 ? (
						bidsSliced.map((bid, i) => (
							<div
								key={`bid-${i}`}
								className="flex py-1.5 px-4 text-xs font-mono hover:bg-muted/10 transition-colors"
							>
								<span className="flex-1 text-success/80 font-medium">
									{bid.price}
								</span>
								<span className="flex-1 text-right text-muted-foreground/80">
									{bid.qty}
								</span>
								<span className="flex-1 text-right text-muted-foreground/40">
									{bid.total.toFixed(4)}
								</span>
							</div>
						))
					) : (
						<div className="flex items-center justify-center flex-1 text-xs text-muted-foreground/40">
							No bids
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
