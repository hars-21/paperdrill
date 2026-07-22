import { OrderbookSkeleton } from "./skeletons";

interface OrderbookProps {
	bids: Record<string, string>;
	asks: Record<string, string>;
	loading?: boolean;
	symbol: string;
}

const DISPLAY_ROWS = 20;

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

	const askMaxTotal = asksSliced.at(-1)?.total ?? 0;
	const bidMaxTotal = bidsSliced.at(-1)?.total ?? 0;

	return (
		<div className="flex h-full flex-col select-none">
			<div className="sticky top-0 z-10 flex border-b border-border/30 px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground/80 bg-card/90 backdrop-blur-xs shrink-0">
				<span className="w-[30%]">Price (USD)</span>
				<span className="w-[35%] text-right">Size ({symbol.split("_")[0]})</span>
				<span className="w-[35%] pr-2 text-right">Total</span>
			</div>

			<div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
				<div className="flex flex-col-reverse justify-start flex-1 min-h-84 max-h-84 overflow-hidden">
					{asksSliced.map((ask, i) => {
						const depth = askMaxTotal > 0 ? ask.total / askMaxTotal : 0;
						return (
							<div
								key={`ask-${i}`}
								className="relative flex h-6 items-center cursor-pointer overflow-hidden px-3 border-b border-dashed border-transparent hover:border-border/50 transition-colors shrink-0"
							>
								<div
									className="absolute top-px right-3 bottom-px w-full pointer-events-none"
									style={{
										background: "rgba(255, 59, 48, 0.32)",
										transformOrigin: "right center",
										transform: `scaleX(${depth})`,
										transition: "transform 0.5s",
									}}
								/>
								<div
									className="absolute top-px right-3 bottom-px w-full pointer-events-none"
									style={{
										background: "rgba(255, 59, 48, 0.16)",
										transformOrigin: "right center",
										transform: `scaleX(${ask.qty / askMaxTotal})`,
										transition: "transform 0.5s",
									}}
								/>
								<div className="flex h-full w-[30%] items-center z-1">
									<span className="text-left text-xs font-normal tabular-nums text-destructive">
										{ask.price}
									</span>
								</div>
								<div className="flex h-full w-[35%] items-center justify-end z-1">
									<span className="text-right text-xs font-normal tabular-nums text-high-emphasis">
										{ask.qty}
									</span>
								</div>
								<div className="flex h-full w-[35%] items-center justify-end z-1">
									<span className="pr-2 text-right text-xs font-normal tabular-nums text-high-emphasis">
										{ask.total.toFixed(2)}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				<div className="px-3 py-2 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-1.5">
						<span className="tabular-nums text-md font-bold tracking-tight text-high-emphasis">
							{midPrice > 0 ? midPrice.toFixed(2) : "—"}
						</span>
					</div>
					<div className="text-[10px] text-medium-emphasis font-medium">
						Spread: <span className="tabular-nums">{spread > 0 ? spread.toFixed(2) : "—"}</span>
					</div>
				</div>

				<div className="flex flex-col justify-start flex-1 min-h-84 max-h-84 overflow-hidden">
					{bidsSliced.map((bid, i) => {
						const depth = bidMaxTotal > 0 ? bid.total / bidMaxTotal : 0;
						return (
							<div
								key={`bid-${i}`}
								className="relative flex h-6 items-center cursor-pointer overflow-hidden px-3 border-b border-dashed border-transparent hover:border-border/50 transition-colors shrink-0"
							>
								<div
									className="absolute top-px right-3 bottom-px w-full pointer-events-none"
									style={{
										background: "rgba(0, 194, 120, 0.32)",
										transformOrigin: "right center",
										transform: `scaleX(${depth})`,
										transition: "transform 0.5s",
									}}
								/>
								<div
									className="absolute top-px right-3 bottom-px w-full pointer-events-none"
									style={{
										background: "rgba(0, 194, 120, 0.16)",
										transformOrigin: "right center",
										transform: `scaleX(${bid.qty / bidMaxTotal})`,
										transition: "transform 0.5s",
									}}
								/>
								<div className="flex h-full w-[30%] items-center z-1">
									<span className="text-left text-xs font-normal tabular-nums text-success">
										{bid.price}
									</span>
								</div>
								<div className="flex h-full w-[35%] items-center justify-end z-1">
									<span className="text-right text-xs font-normal tabular-nums text-high-emphasis">
										{bid.qty}
									</span>
								</div>
								<div className="flex h-full w-[35%] items-center justify-end z-1">
									<span className="pr-2 text-right text-xs font-normal tabular-nums text-high-emphasis">
										{bid.total.toFixed(2)}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
