import { Inbox, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { OrderRecord, UserBalance } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { OpenOrderSkeleton } from "./skeletons";
import { useAuth } from "@/context/AuthContext";

type Tab = "open" | "history" | "balance";

interface OpenOrdersProps {
	loading?: boolean;
	refreshKey?: number;
	symbol?: string;
}

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: OrderRecord["status"] }) {
	const styles: Record<OrderRecord["status"], string> = {
		OPEN: "bg-primary/10 text-primary",
		PARTIALLY_FILLED: "bg-primary/10 text-primary",
		FILLED: "bg-green-bg/10 text-success",
		CANCELLED: "bg-muted text-medium-emphasis",
	};
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}
		>
			{status.replace("_", " ")}
		</span>
	);
}

export function DataPanel({ loading, refreshKey, symbol }: OpenOrdersProps) {
	const { user } = useAuth();
	const [tab, setTab] = useState<Tab>("open");
	const [openOrders, setOpenOrders] = useState<OrderRecord[]>([]);
	const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
	const [balance, setBalance] = useState<UserBalance>({});
	const [cancelling, setCancelling] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [sideFilter, setSideFilter] = useState<"all" | "BUY" | "SELL">("all");
	const [typeFilter, setTypeFilter] = useState<"all" | "LIMIT" | "MARKET">("all");
	const [page, setPage] = useState(1);

	const fetchAll = useCallback(async () => {
		try {
			const [open, history, bal] = await Promise.all([
				api.getOpenOrders(),
				api.getOrders({ limit: 50 }),
				api.getBalance().catch(() => ({})),
			]);
			const uniqueOpen = open.filter((o, i, self) => i === self.findIndex((s) => s.id === o.id));
			setOpenOrders(uniqueOpen);
			setAllOrders(history);
			setBalance(bal);
		} catch (err) {
			console.error("Failed to fetch orders:", err);
			toast.error("Failed to load orders");
		}
	}, []);

	const handleCancel = async (orderId: string) => {
		setCancelling(orderId);
		try {
			await api.cancelOrder(orderId);
			toast.success("Order cancelled");
			await fetchAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to cancel order");
		} finally {
			setCancelling(null);
		}
	};

	useEffect(() => {
		if (user) fetchAll();
	}, [refreshKey, user, fetchAll]);

	const filteredOpen = useMemo(() => {
		return openOrders.filter((o) => {
			if (symbol && o.symbol !== symbol) return false;
			if (!o.symbol.toLowerCase().includes(search.toLowerCase())) return false;
			if (sideFilter !== "all" && o.side !== sideFilter) return false;
			if (typeFilter !== "all" && o.type !== typeFilter) return false;
			return true;
		});
	}, [openOrders, search, sideFilter, typeFilter, symbol]);

	const filteredHistory = useMemo(() => {
		return allOrders.filter((o) => {
			if (symbol && o.symbol !== symbol) return false;
			if (!o.symbol.toLowerCase().includes(search.toLowerCase())) return false;
			if (sideFilter !== "all" && o.side !== sideFilter) return false;
			if (typeFilter !== "all" && o.type !== typeFilter) return false;
			return true;
		});
	}, [allOrders, search, sideFilter, typeFilter, symbol]);

	const balanceEntries = useMemo(() => {
		return Object.entries(balance).filter(
			([, v]) => Number(v.available) > 0 || Number(v.locked) > 0,
		);
	}, [balance]);

	const activeData = tab === "open" ? filteredOpen : tab === "history" ? filteredHistory : [];
	const totalPages = Math.max(1, Math.ceil(activeData.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const paginatedData = activeData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

	const resetFilters = () => {
		setSearch("");
		setSideFilter("all");
		setTypeFilter("all");
		setPage(1);
	};

	useEffect(() => {
		setPage(1);
	}, [search, sideFilter, typeFilter]);

	const tabs: { key: Tab; label: string; count?: number }[] = [
		{ key: "balance", label: "Balances" },
		{ key: "open", label: "Open Orders", count: openOrders.length },
		{ key: "history", label: "Order History", count: allOrders.length },
	];

	if (loading) {
		return <OpenOrderSkeleton />;
	}

	if (!user) {
		return (
			<div className="flex items-center justify-center h-full min-h-75">
				<p className="text-high-emphasis text-sm">
					Please{" "}
					<a href="/login" className="text-primary hover:text-primary/80 text-sm font-medium">
						log in
					</a>{" "}
					or{" "}
					<a href="/login" className="text-primary hover:text-primary/80 text-sm font-medium">
						sign up
					</a>{" "}
					to view your orders
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full select-none overflow-hidden">
			<div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1 px-3 pt-3 pb-2 shrink-0">
				<div className="flex items-center flex-row gap-1 overflow-x-auto no-scrollbar">
					{tabs.map((t) => (
						<button
							key={t.key}
							onClick={() => {
								setTab(t.key);
								resetFilters();
							}}
							className={`flex items-center gap-1.5 cursor-pointer rounded-lg py-1 whitespace-nowrap text-[13px] font-semibold px-3 h-8 transition-colors ${
								tab === t.key
									? "text-high-emphasis bg-muted"
									: "text-medium-emphasis hover:text-high-emphasis"
							}`}
						>
							{t.label}
							{t.count !== undefined && t.count > 0 && (
								<span className="text-[10px] font-medium text-low-emphasis tabular-nums">
									({t.count})
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{tab !== "balance" && (
				<div className="flex items-center gap-2 px-3 pb-2 shrink-0 flex-wrap">
					<div className="relative flex-1 min-w-35 max-w-55">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-low-emphasis" />
						<Input
							placeholder="Search market..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-8 pl-7 pr-7 text-xs rounded-md"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-low-emphasis hover:text-medium-emphasis"
							>
								<X className="size-3" />
							</button>
						)}
					</div>
					<div className="flex items-center gap-1">
						{(["all", "BUY", "SELL"] as const).map((s) => (
							<button
								key={s}
								onClick={() => setSideFilter(s)}
								className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
									sideFilter === s
										? s === "BUY"
											? "bg-green-bg/10 text-success"
											: s === "SELL"
												? "bg-red-bg/10 text-destructive"
												: "bg-muted text-high-emphasis"
										: "text-medium-emphasis hover:text-high-emphasis"
								}`}
							>
								{s === "all" ? "All" : s === "BUY" ? "Buy" : "Sell"}
							</button>
						))}
					</div>
					<div className="flex items-center gap-1">
						{(["all", "LIMIT", "MARKET"] as const).map((t) => (
							<button
								key={t}
								onClick={() => setTypeFilter(t)}
								className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
									typeFilter === t
										? "bg-muted text-high-emphasis"
										: "text-medium-emphasis hover:text-high-emphasis"
								}`}
							>
								{t === "all" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="flex-1 min-h-0 px-3">
				{tab === "open" && (
					<>
						{paginatedData.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Market</TableHead>
										<TableHead>Side</TableHead>
										<TableHead>Type</TableHead>
										<TableHead className="text-right">Price</TableHead>
										<TableHead className="text-right">Size</TableHead>
										<TableHead className="text-right">Filled</TableHead>
										<TableHead className="text-right">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedData.map((order) => (
										<TableRow key={order.id}>
											<TableCell>{order.symbol.replace("_", "/")}</TableCell>
											<TableCell
												className={order.side === "BUY" ? "text-green-text" : "text-red-text"}
											>
												{order.side}
											</TableCell>
											<TableCell>{order.type}</TableCell>
											<TableCell className="text-right tabular-nums">
												{order.price ?? "—"}
											</TableCell>
											<TableCell className="text-right tabular-nums">{order.qty}</TableCell>
											<TableCell className="text-right tabular-nums">
												{Number(order.filledQty) > 0 ? (
													<span className="text-primary font-medium">
														{((Number(order.filledQty) / Number(order.qty)) * 100).toFixed(1)}%
													</span>
												) : (
													<span className="text-low-emphasis">0%</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													onClick={() => handleCancel(order.id)}
													disabled={cancelling === order.id}
													variant="ghost"
													size="icon-sm"
													className="text-low-emphasis hover:text-destructive hover:bg-red-bg/10"
												>
													<X className="size-3.5" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<EmptyState
								message={
									search || sideFilter !== "all" || typeFilter !== "all"
										? "No orders match your filters"
										: "No open orders"
								}
							/>
						)}
					</>
				)}

				{tab === "history" && (
					<>
						{paginatedData.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Market</TableHead>
										<TableHead>Side</TableHead>
										<TableHead>Type</TableHead>
										<TableHead className="text-right">Price</TableHead>
										<TableHead className="text-right">Size</TableHead>
										<TableHead className="text-right">Filled</TableHead>
										<TableHead className="text-right">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedData.map((order) => (
										<TableRow key={order.id}>
											<TableCell>{order.symbol.replace("_", "/")}</TableCell>
											<TableCell
												className={order.side === "BUY" ? "text-green-text" : "text-red-text"}
											>
												{order.side}
											</TableCell>
											<TableCell>{order.type}</TableCell>
											<TableCell className="text-right tabular-nums">
												{order.price ?? "—"}
											</TableCell>
											<TableCell className="text-right tabular-nums">{order.qty}</TableCell>
											<TableCell className="text-right tabular-nums">
												{Number(order.filledQty) > 0 ? (
													<span className="text-primary font-medium">
														{((Number(order.filledQty) / Number(order.qty)) * 100).toFixed(1)}%
													</span>
												) : (
													<span className="text-low-emphasis">0%</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<StatusBadge status={order.status} />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<EmptyState
								message={
									search || sideFilter !== "all" || typeFilter !== "all"
										? "No orders match your filters"
										: "No order history"
								}
							/>
						)}
					</>
				)}

				{tab === "balance" && (
					<>
						{balanceEntries.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Asset</TableHead>
										<TableHead className="text-right">Available</TableHead>
										<TableHead className="text-right">Locked</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{balanceEntries.map(([asset, bal]) => {
										const avail = Number(bal.available);
										const locked = Number(bal.locked);
										const total = avail + locked;
										return (
											<TableRow key={asset}>
												<TableCell className="font-medium">{asset}</TableCell>
												<TableCell className="text-right tabular-nums">
													{bal.available ?? "0"}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{Number(bal.locked) > 0 ? (
														<span className="text-medium-emphasis">{bal.locked}</span>
													) : (
														<span className="text-low-emphasis">0</span>
													)}
												</TableCell>
												<TableCell className="text-right tabular-nums font-medium">
													{total}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						) : (
							<EmptyState message="No balances found" />
						)}
					</>
				)}
			</div>

			{tab !== "balance" && totalPages > 1 && (
				<div className="flex items-center justify-between px-3 py-2 shrink-0 border-t border-border/40">
					<span className="text-[11px] text-medium-emphasis tabular-nums">
						{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, activeData.length)} of{" "}
						{activeData.length}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={safePage <= 1}
							onClick={() => setPage((p) => p - 1)}
							className="size-7"
						>
							<ChevronLeft className="size-3.5" />
						</Button>
						<span className="text-[11px] text-medium-emphasis tabular-nums px-1">
							{safePage}/{totalPages}
						</span>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={safePage >= totalPages}
							onClick={() => setPage((p) => p + 1)}
							className="size-7"
						>
							<ChevronRight className="size-3.5" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex items-center justify-center py-12">
			<div className="flex flex-col items-center justify-center text-medium-emphasis gap-2">
				<Inbox className="size-6 stroke-[1.5] text-low-emphasis" />
				<p className="text-xs font-medium">{message}</p>
			</div>
		</div>
	);
}
