import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import type { Trade } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { toast } from "sonner";

function formatTime(ts: string) {
	const d = new Date(ts);
	return d.toLocaleTimeString("en-US", { hour12: false });
}

export function Trades({ symbol, loading }: { symbol: string; loading?: boolean }) {
	const [trades, setTrades] = useState<Trade[]>([]);

	useEffect(() => {
		setTrades([]);

		api
			.getTrades(symbol)
			.then((data) => {
				const mapped = (Array.isArray(data) ? data : []).map((f) => ({
					id: f.id,
					price: f.price,
					qty: f.qty,
					side: f.side,
					timestamp: f.createdAt,
				}));
				setTrades(mapped);
			})
			.catch((err) => {
				console.error("Failed to load trades:", err);
				toast.error("Failed to load trades");
			});

		const handleTrade = (msg: any) => {
			if (msg.event === "trade") {
				setTrades((prev) =>
					[
						{
							id: msg.id,
							price: msg.price,
							qty: msg.qty,
							side: msg.side,
							timestamp: msg.timestamp,
						},
						...prev,
					].slice(0, 50),
				);
			}
		};

		const unsubscribe = wsManager.subscribe(`trade:${symbol}`, handleTrade);

		return () => {
			unsubscribe();
		};
	}, [symbol]);

	if (loading) {
		return (
			<div className="flex h-full flex-col p-4 gap-2">
				{Array.from({ length: 10 }).map((_, i) => (
					<Skeleton key={i} className="h-3 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col select-none">
			<div className="sticky top-0 z-10 flex border-b border-border/30 px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground/80 bg-card/90 backdrop-blur-xs shrink-0">
				<span className="w-[30%]">Price (USD)</span>
				<span className="w-[35%] text-right">Size ({symbol.split("_")[0]})</span>
				<span className="w-[35%] pr-2 text-right">Time</span>
			</div>

			<div className="flex flex-col justify-start flex-1 min-h-178 max-h-178 overflow-hidden overflow-y-auto">
				{trades.length === 0 ? (
					<div className="flex items-center justify-center h-full text-xs text-low-emphasis">
						No trades yet
					</div>
				) : (
					trades.map((t, i) => (
						<div
							key={t.id ?? i}
							className="relative flex h-6 items-center overflow-hidden px-3 border-b border-dashed border-transparent hover:border-border/50 transition-colors shrink-0"
						>
							<div className="flex h-full w-[30%] items-center z-1">
								<span
									className={`text-left text-xs font-normal tabular-nums ${
										t.side === "BUY" ? "text-success" : "text-destructive"
									}`}
								>
									{t.price}
								</span>
							</div>
							<div className="flex h-full w-[35%] items-center justify-end z-1">
								<span className="text-right text-xs font-normal tabular-nums text-high-emphasis">
									{t.qty}
								</span>
							</div>
							<div className="flex h-full w-[35%] items-center justify-end z-1">
								<span className="pr-2 text-right text-xs font-normal tabular-nums text-muted-foreground/60">
									{formatTime(t.timestamp)}
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
