import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import type { Trade } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { toast } from "sonner";

function formatTime(ts: number) {
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
				const mapped = (Array.isArray(data) ? data : []).map((f: any) => ({
					id: f.fillId,
					price: f.price,
					qty: f.qty,
					maker: f.isBuyerMaker ?? null,
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
							maker: msg.maker,
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
		<div className="flex h-full flex-col select-none relative overflow-hidden">
			<div className="sticky top-0 z-10 flex border-b border-border/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 bg-card/90 backdrop-blur-xs shrink-0">
				<span className="flex-1">Price (USD)</span>
				<span className="flex-1 text-right">Size ({symbol.split("_")[0]})</span>
				<span className="flex-1 text-right"></span>
			</div>

			<div className="flex-1 overflow-y-auto py-1.5">
				{trades.length === 0 ? (
					<div className="flex items-center justify-center h-full text-xs text-low-emphasis">
						No trades yet
					</div>
				) : (
					trades.map((t, i) => (
						<div
							key={t.id ?? i}
							className="flex py-1.5 px-4 text-xs font-mono hover:bg-muted/10 transition-colors"
						>
							<span
								className={`flex-1 font-medium ${
									t.maker === null
										? "text-high-emphasis/80"
										: t.maker
											? "text-destructive/80"
											: "text-success/80"
								}`}
							>
								{t.price}
							</span>
							<span className="flex-1 text-right text-muted-foreground/80">{t.qty}</span>
							<span className="flex-1 text-right text-muted-foreground/40">
								{formatTime(t.timestamp)}
							</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
