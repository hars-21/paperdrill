import { useEffect, useState, useMemo, useCallback } from "react";
import {
	Search,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	ChevronUp,
	ChevronDown,
} from "lucide-react";
import type { OrderRecord } from "@/types";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";


type SortField =
	| "symbol"
	| "side"
	| "type"
	| "price"
	| "qty"
	| "filledQty"
	| "status"
	| "createdAt";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = ["OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"] as const;
const PAGE_SIZE = 15;

function formatDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function SortIcon({
	field,
	sortField,
	sortDir,
}: {
	field: SortField;
	sortField: SortField;
	sortDir: SortDir;
}) {
	if (field !== sortField) return <ChevronsUpDown className="size-3 text-low-emphasis" />;
	return sortDir === "asc" ? (
		<ChevronUp className="size-3 text-high-emphasis" />
	) : (
		<ChevronDown className="size-3 text-high-emphasis" />
	);
}

export function OrdersTable() {
	const [orders, setOrders] = useState<OrderRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [sortField, setSortField] = useState<SortField>("createdAt");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [fetching, setFetching] = useState(false);

	const fetchOrders = useCallback(
		async (pageNum: number) => {
			setFetching(true);
			try {
				const data = await api.getOrders({
					limit: PAGE_SIZE,
					page: pageNum,
					...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
				});
				setOrders(data);
				setHasMore(data.length === PAGE_SIZE);
			} catch {
				toast.error("Failed to load orders");
			} finally {
				setFetching(false);
				setLoading(false);
			}
		},
		[statusFilter],
	);

	useEffect(() => {
		setLoading(true);
		setPage(1);
		fetchOrders(1);
	}, [fetchOrders]);

	const symbols = useMemo(() => {
		const set = new Set(orders.map((o) => o.symbol));
		return Array.from(set).sort();
	}, [orders]);

	const filtered = useMemo(() => {
		if (!search.trim()) return orders;
		const q = search.toLowerCase();
		return orders.filter(
			(o) =>
				o.symbol.toLowerCase().includes(q) ||
				o.id.toLowerCase().includes(q) ||
				o.side.toLowerCase().includes(q) ||
				o.status.toLowerCase().includes(q),
		);
	}, [orders, search]);

	const sorted = useMemo(() => {
		const copy = [...filtered];
		copy.sort((a, b) => {
			let av: string | number;
			let bv: string | number;
			switch (sortField) {
				case "price":
					av = Number(a.price ?? 0);
					bv = Number(b.price ?? 0);
					break;
				case "qty":
					av = Number(a.qty);
					bv = Number(b.qty);
					break;
				case "filledQty":
					av = Number(a.filledQty);
					bv = Number(b.filledQty);
					break;
				default:
					av = String(a[sortField]);
					bv = String(b[sortField]);
			}
			if (av < bv) return sortDir === "asc" ? -1 : 1;
			if (av > bv) return sortDir === "asc" ? 1 : -1;
			return 0;
		});
		return copy;
	}, [filtered, sortField, sortDir]);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("asc");
		}
	};

	const goToPage = (p: number) => {
		setPage(p);
		fetchOrders(p);
	};

	const thClass =
		"px-4 py-2.5 text-left text-[10px] font-medium text-medium-emphasis select-none";

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative flex-1 min-w-45">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-low-emphasis" />
					<Input
						placeholder="Search symbol, side, status..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-8 h-8 text-xs bg-background/50 border-border/40"
					/>
				</div>
				<Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
					<SelectTrigger className="w-35 h-8 text-xs border-border/40">
						<SelectValue placeholder="All" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All</SelectItem>
						{STATUS_OPTIONS.map((s) => (
							<SelectItem key={s} value={s}>
								{s.replace("_", " ")}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-lg border border-border/40 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="border-border/30 hover:bg-transparent">
							<TableHead className={thClass}>
								<button
									onClick={() => handleSort("symbol")}
									className="flex items-center gap-1 cursor-pointer"
								>
									Market <SortIcon field="symbol" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className={thClass}>
								<button
									onClick={() => handleSort("side")}
									className="flex items-center gap-1 cursor-pointer"
								>
									Side <SortIcon field="side" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className={thClass}>
								<button
									onClick={() => handleSort("type")}
									className="flex items-center gap-1 cursor-pointer"
								>
									Type <SortIcon field="type" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className="px-4 py-2.5 text-right text-[10px] font-medium text-medium-emphasis select-none">
								<button
									onClick={() => handleSort("price")}
									className="flex items-center gap-1 cursor-pointer justify-end ml-auto"
								>
									Price <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className="px-4 py-2.5 text-right text-[10px] font-medium text-medium-emphasis select-none">
								<button
									onClick={() => handleSort("qty")}
									className="flex items-center gap-1 cursor-pointer justify-end ml-auto"
								>
									Qty <SortIcon field="qty" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className="px-4 py-2.5 text-right text-[10px] font-medium text-medium-emphasis select-none">
								<button
									onClick={() => handleSort("filledQty")}
									className="flex items-center gap-1 cursor-pointer justify-end ml-auto"
								>
									Filled <SortIcon field="filledQty" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className={thClass}>
								<button
									onClick={() => handleSort("status")}
									className="flex items-center gap-1 cursor-pointer"
								>
									Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
							<TableHead className="px-4 py-2.5 text-right text-[10px] font-medium text-medium-emphasis select-none">
								<button
									onClick={() => handleSort("createdAt")}
									className="flex items-center gap-1 cursor-pointer justify-end ml-auto"
								>
									Date <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
								</button>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading || fetching ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i} className="border-border/20">
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j} className="px-4 py-2.5">
											<div className="h-3 bg-muted/40 rounded animate-pulse" />
										</TableCell>
									))}
								</TableRow>
							))
						) : sorted.length === 0 ? (
							<TableRow className="border-border/20">
								<TableCell
									colSpan={8}
									className="px-4 py-8 text-center text-xs text-muted-foreground"
								>
									{search || statusFilter !== "ALL"
										? "No orders match your filters"
										: "No orders yet"}
								</TableCell>
							</TableRow>
						) : (
							sorted.map((order) => {
								const fillPct =
									Number(order.qty) > 0 ? (Number(order.filledQty) / Number(order.qty)) * 100 : 0;
								return (
									<TableRow
										key={order.id}
										className="border-border/20 hover:bg-muted/10 transition-colors"
									>
										<TableCell className="px-4 py-2.5 text-xs font-medium text-high-emphasis">
											{order.symbol.replace("_", "/")}
										</TableCell>
										<TableCell className="px-4 py-2.5">
											<span
												className={`text-xs font-semibold ${order.side === "BUY" ? "text-success" : "text-destructive"}`}
											>
												{order.side}
											</span>
										</TableCell>
										<TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
											{order.type}
										</TableCell>
										<TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-high-emphasis">
											{order.price ?? "—"}
										</TableCell>
										<TableCell className="px-4 py-2.5 text-right text-xs tabular-nums text-high-emphasis">
											{order.qty}
										</TableCell>
										<TableCell className="px-4 py-2.5 text-right text-xs tabular-nums">
											{fillPct > 0 ? (
												<span className="text-primary font-medium">{fillPct.toFixed(1)}%</span>
											) : (
												<span className="text-low-emphasis">0%</span>
											)}
										</TableCell>
										<TableCell className="px-4 py-2.5">
										<span
											className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
												order.status === "OPEN"
													? "bg-primary/10 text-primary"
													: order.status === "FILLED"
														? "bg-green-bg/10 text-success"
														: order.status === "PARTIALLY_FILLED"
															? "bg-red-text/10 text-red-text"
															: "bg-muted text-medium-emphasis"
											}`}
										>
												{order.status.replace("_", " ")}
											</span>
										</TableCell>
										<TableCell className="px-4 py-2.5 text-right text-[11px] tabular-nums text-muted-foreground/70">
											{formatDate(order.createdAt)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between text-[11px] text-muted-foreground">
				<span>
					{sorted.length} order{sorted.length !== 1 ? "s" : ""}
					{search || statusFilter !== "ALL" ? " (filtered)" : ""}
				</span>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-[11px]"
						disabled={page <= 1 || fetching}
						onClick={() => goToPage(page - 1)}
					>
						<ChevronLeft className="size-3.5" />
					</Button>
					<span className="px-2 tabular-nums">Page {page}</span>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-[11px]"
						disabled={!hasMore || fetching}
						onClick={() => goToPage(page + 1)}
					>
						<ChevronRight className="size-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
