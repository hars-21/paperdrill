import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import type { Trade } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { toast } from "sonner";

function formatTime(ts: string | number) {
	return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export function Trades({
	symbol,
	loading,
	compact,
}: {
	symbol: string;
	loading?: boolean;
	compact?: boolean;
}) {
	const [trades, setTrades] = useState<Trade[]>([]);
	const limit = compact ? 25 : 50;

	useEffect(() => {
		setTrades([]);

		api
			.getTrades(symbol, limit)
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

		const handleTrade = (msg: unknown) => {
			const data = msg as Record<string, unknown>;
			if (data.event === "trade") {
				const ts =
					typeof data.timestamp === "number"
						? data.timestamp
						: Number(data.timestamp) || Date.now();
				const trade: Trade = {
					id: String(data.id ?? ""),
					price: String(data.price ?? "0"),
					qty: String(data.qty ?? "0"),
					side: (data.side === "BUY" || data.side === "SELL" ? data.side : "BUY") as "BUY" | "SELL",
					timestamp: ts,
				};
				setTrades((prev) => [trade, ...prev].slice(0, 50));
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
			<div className="flex flex-row min-w-0 gap-1 px-3 py-2">
				<div className="flex justify-between flex-row w-2/3 min-w-0 gap-1">
					<p className="text-high-emphasis truncate text-xs">Price (USD)</p>
					<p className="text-medium-emphasis truncate text-right text-xs">
						Size ({symbol.split("_")[0]})
					</p>
				</div>
			</div>

			<div className="flex flex-col justify-start flex-1 overflow-hidden overflow-y-auto">
				{trades.length === 0 ? (
					<div className="flex items-center justify-center h-full text-xs text-low-emphasis">
						No trades yet
					</div>
				) : (
					trades.map((t, i) => (
						<div
							key={t.id ?? i}
							className="flex h-6 items-center overflow-hidden px-3 border-b border-dashed border-transparent hover:border-border/50 transition-colors shrink-0"
						>
							<div className="flex h-full w-[30%] items-center">
								<span
									className={`text-left text-xs font-normal tabular-nums ${
										t.side === "BUY" ? "text-green-text/90" : "text-red-text/90"
									}`}
								>
									{t.price}
								</span>
							</div>
							<div className="flex h-full w-[35%] items-center justify-end">
								<span className="text-right text-xs font-normal tabular-nums text-high-emphasis/90">
									{t.qty}
								</span>
							</div>
							<div className="flex h-full w-[35%] items-center justify-end">
								<span className="text-right text-xs font-normal tabular-nums text-medium-emphasis">
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
