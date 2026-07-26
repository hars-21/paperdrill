import AsksIcon from "../icons/asks-icon";
import BidsAsksIcon from "../icons/bids-asks-icon";
import BidsIcon from "../icons/bids-icon";
import { Button } from "../ui/button";
import { OrderbookSkeleton } from "./skeletons";

interface OrderbookProps {
	bids: Record<string, string>;
	asks: Record<string, string>;
	loading?: boolean;
	symbol: string;
}

const DISPLAY_ROWS = 18;

export function Orderbook({ bids, asks, loading, symbol }: OrderbookProps) {
	if (loading) {
		return <OrderbookSkeleton />;
	}

	const sortedAsks = Object.entries(asks)
		.map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }))
		.filter(({ qty }) => qty > 0)
		.sort((a, b) => a.price - b.price);

	const sortedBids = Object.entries(bids)
		.map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }))
		.filter(({ qty }) => qty > 0)
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

	const totalDepth = askMaxTotal + bidMaxTotal;
	const bidDepthPct = totalDepth > 0 ? (bidMaxTotal / totalDepth) * 100 : 50;
	const askDepthPct = 100 - bidDepthPct;

	return (
		<div className="flex h-full flex-col select-none">
			<div className="flex flex-col h-full grow">
				<div className="flex items-center justify-between flex-row pl-2">
					<div className="flex items-center flex-row gap-2">
						<div className="flex items-center justify-center flex-row gap-2">
							<Button variant="icon">
								<BidsIcon />
							</Button>
							<Button variant="icon">
								<AsksIcon />
							</Button>
							<Button variant="icon">
								<BidsAsksIcon />
							</Button>
						</div>
					</div>
				</div>

				<div className="flex flex-row min-w-0 gap-1 px-3 py-2">
					<div className="flex justify-between flex-row w-2/3 min-w-0 gap-1">
						<p className="text-high-emphasis truncate text-xs">Price (USD)</p>
						<p className="text-medium-emphasis truncate text-right text-xs">
							Size ({symbol.split("_")[0]})
						</p>
					</div>
					<p className="text-medium-emphasis w-1/3 truncate text-right text-xs">
						Total ({symbol.split("_")[0]})
					</p>
				</div>

				<div className="flex flex-col no-scrollbar h-full flex-1 font-sans overflow-y-auto">
					<div className="flex flex-col flex-1">
						<div className="flex justify-end h-full w-full flex-col-reverse">
							{asksSliced.map((ask, i) => {
								const depth = askMaxTotal > 0 ? ask.total / askMaxTotal : 0;
								const barWidth = askMaxTotal > 0 ? ask.qty / askMaxTotal : 0;
								return (
									<div key={`ask-${i}`} className="flex h-6 items-center">
										<div className="flex items-center flex-row relative h-full w-full cursor-pointer overflow-hidden px-3 border-t border-dashed border-transparent hover:border-border/50 transition-colors">
											<div
												className="absolute top-px right-3 bottom-px w-full pointer-events-none bg-red-bg/50"
												style={{
													transformOrigin: "right center",
													transform: `scaleX(${depth})`,
													transition: "transform 0.5s",
												}}
											/>
											<div
												className="absolute top-px right-3 bottom-px w-full pointer-events-none bg-red-bg"
												style={{
													transformOrigin: "right center",
													transform: `scaleX(${barWidth})`,
													transition: "transform 0.5s",
												}}
											/>
											<div className="flex h-full w-[30%] items-center">
												<p className="text-left text-xs font-normal tabular-nums text-red-text/90 z-10">
													{ask.price}
												</p>
											</div>
											<div className="flex h-full w-[35%] items-center justify-end">
												<p className="text-right text-xs font-normal tabular-nums text-high-emphasis z-10">
													{ask.qty}
												</p>
											</div>
											<div className="flex h-full w-[35%] items-center justify-end">
												<p className="pr-2 text-right text-xs font-normal tabular-nums text-high-emphasis z-10">
													{ask.total.toFixed(4)}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					<div className="bg-card sticky z-10 flex-0 snap-center px-3 py-1 border-y border-border/20">
						<div className="flex justify-between flex-row">
							<div className="flex items-center flex-row gap-1.5">
								<button className="hover:opacity-90" type="button">
									<p className="font-medium tabular-nums text-sm text-high-emphasis">
										{midPrice > 0 ? midPrice.toFixed(2) : "—"}
									</p>
								</button>
							</div>
							<span className="text-[10px] text-medium-emphasis tabular-nums">
								Spread: {spread > 0 ? spread.toFixed(2) : "—"}
							</span>
						</div>
					</div>

					<div className="flex flex-col flex-1">
						<div className="flex justify-start flex-col h-full w-full">
							{bidsSliced.map((bid, i) => {
								const depth = bidMaxTotal > 0 ? bid.total / bidMaxTotal : 0;
								const barWidth = bidMaxTotal > 0 ? bid.qty / bidMaxTotal : 0;
								return (
									<div key={`bid-${i}`} className="flex h-6 items-center">
										<div className="flex items-center flex-row relative h-full w-full cursor-pointer overflow-hidden px-3 border-b border-dashed border-transparent hover:border-border/50 transition-colors">
											<div
												className="absolute top-px right-3 bottom-px w-full pointer-events-none bg-green-bg/50"
												style={{
													transformOrigin: "right center",
													transform: `scaleX(${depth})`,
													transition: "transform 0.5s",
												}}
											/>
											<div
												className="absolute top-px right-3 bottom-px w-full pointer-events-none bg-green-bg"
												style={{
													transformOrigin: "right center",
													transform: `scaleX(${barWidth})`,
													transition: "transform 0.5s",
												}}
											/>
											<div className="flex h-full w-[30%] items-center">
												<p className="text-left text-xs font-normal tabular-nums text-green-text/90 z-10">
													{bid.price}
												</p>
											</div>
											<div className="flex h-full w-[35%] items-center justify-end">
												<p className="text-right text-xs font-normal tabular-nums text-high-emphasis z-10">
													{bid.qty}
												</p>
											</div>
											<div className="flex h-full w-[35%] items-center justify-end">
												<p className="pr-2 text-right text-xs font-normal tabular-nums text-high-emphasis z-10">
													{bid.total.toFixed(4)}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden mt-2 rounded-b-sm">
					<div className="flex justify-between">
						<p className="text-green-text z-10 py-1 pl-2 text-xs font-normal">
							{bidDepthPct.toFixed(0)}%
						</p>
						<p className="text-red-text z-10 py-1 pr-2 text-xs font-normal">
							{askDepthPct.toFixed(0)}%
						</p>
					</div>
					<div>
						<div
							className="absolute top-0 bottom-0 -skew-x-25 border-r-2 border-card bg-green-bg"
							style={{
								left: -20,
								width: `calc(${bidDepthPct}% + 20px)`,
								transition: "width 0.3s ease-in-out",
							}}
						/>
						<div
							className="absolute top-0 bottom-0 -skew-x-25 border-l-2 border-card bg-red-bg"
							style={{
								right: -20,
								width: `calc(${askDepthPct}% + 20px)`,
								transition: "width 0.3s ease-in-out",
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
