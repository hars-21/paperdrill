import { useCallback, useMemo, useState } from "react";
import {
	ArrowDown10,
	ArrowUp01,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	CircleAlert,
	Inbox,
	LockKeyhole,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { OrderRecord, UserBalance, UserTrade } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import {
	useCancelOrder,
	useOpenOrders,
	useOrderHistory,
	useTradeHistory,
} from "@/hooks/use-account";
import { useBalance } from "@/hooks/use-balance";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";
import { AssetIcon } from "../icons/asset-icon";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

type Tab = "balance" | "open" | "orders" | "trades";
type SideFilter = "all" | "BUY" | "SELL";
type TypeFilter = "all" | "LIMIT" | "MARKET";
type StatusFilter = "all" | OrderRecord["status"];
type SortField = "time" | "price" | "quantity";
type SortDirection = "asc" | "desc";

type DataPanelProps = {
	loading?: boolean;
	symbol?: string;
};

const PAGE_SIZE = 10;
const ORDER_HISTORY_PARAMS = { limit: 100 } as const;

function titleCase(value: string) {
	return value
		.toLowerCase()
		.replaceAll("_", " ")
		.replace(/^./, (character) => character.toUpperCase());
}

function orderStatusClass(status: OrderRecord["status"]) {
	if (status === "FILLED") return "text-green-text";
	if (status === "PARTIALLY_FILLED") return "text-chart-5";
	if (status === "CANCELLED") return "text-medium-emphasis";
	return "text-high-emphasis";
}

function sideClass(side: "BUY" | "SELL") {
	return side === "BUY" ? "text-green-text" : "text-red-text";
}

function sortRows<T extends OrderRecord | UserTrade>(
	rows: T[],
	field: SortField,
	direction: SortDirection,
) {
	return [...rows].sort((left, right) => {
		const leftValue =
			field === "time"
				? Date.parse(left.createdAt)
				: field === "price"
					? Number(left.price ?? ("averagePrice" in left ? left.averagePrice : 0) ?? 0)
					: Number(left.qty);
		const rightValue =
			field === "time"
				? Date.parse(right.createdAt)
				: field === "price"
					? Number(right.price ?? ("averagePrice" in right ? right.averagePrice : 0) ?? 0)
					: Number(right.qty);
		return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
	});
}

function SortableHead({
	field,
	label,
	activeField,
	direction,
	onSort,
	className,
}: {
	field: SortField;
	label: string;
	activeField: SortField;
	direction: SortDirection;
	onSort: (field: SortField) => void;
	className?: string;
}) {
	const active = field === activeField;
	const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp01 : ArrowDown10;
	return (
		<TableHead className={className}>
			<button
				type="button"
				onClick={() => onSort(field)}
				className="ml-auto flex cursor-pointer items-center gap-1 rounded-sm text-inherit outline-none transition-colors hover:text-high-emphasis focus-visible:ring-2 focus-visible:ring-ring"
			>
				{label}
				<Icon className={cn("size-3.5", !active && "text-low-emphasis")} />
			</button>
		</TableHead>
	);
}

function MarketCell({ symbol, market }: { symbol: string; market: MarketLookup }) {
	const baseAsset = market?.baseAsset ?? symbol.split("_")[0] ?? symbol;
	return (
		<TableCell className="px-3">
			<div className="flex items-center gap-2 whitespace-nowrap">
				<AssetIcon asset={baseAsset} className="size-6 shrink-0" />
				<span>{symbol.replace("_", "/")}</span>
			</div>
		</TableCell>
	);
}

function TableLoading({ columns }: { columns: number }) {
	return (
		<div className="space-y-3 px-3 py-4">
			{Array.from({ length: PAGE_SIZE }).map((_, row) => (
				<div
					key={row}
					className="grid gap-4"
					style={{ gridTemplateColumns: `repeat(${columns}, minmax(4rem, 1fr))` }}
				>
					{Array.from({ length: columns }).map((__, column) => (
						<Skeleton key={column} className="h-4 w-full max-w-24" />
					))}
				</div>
			))}
		</div>
	);
}

function EmptyState({ children }: { children: string }) {
	return (
		<div
			role="status"
			className="flex min-h-44 flex-col items-center justify-center gap-2 px-4 text-center"
		>
			<div className="flex size-9 items-center justify-center rounded-full bg-secondary text-medium-emphasis">
				<Inbox className="size-4" />
			</div>
			<p className="text-sm font-medium text-high-emphasis">{children}</p>
			<p className="max-w-sm text-xs text-medium-emphasis">
				There is nothing to show for this view yet.
			</p>
		</div>
	);
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="flex min-h-44 flex-col items-center justify-center gap-2 px-4 text-center"
		>
			<div className="flex size-9 items-center justify-center rounded-full bg-red-bg text-red-text">
				<CircleAlert className="size-4" />
			</div>
			<p className="text-sm font-medium text-high-emphasis">Could not load account data</p>
			<p className="max-w-sm text-xs text-medium-emphasis">{message}</p>
			<Button type="button" variant="secondary" size="sm" onClick={onRetry}>
				Try again
			</Button>
		</div>
	);
}

function Pagination({
	page,
	total,
	onChange,
}: {
	page: number;
	total: number;
	onChange: (page: number) => void;
}) {
	const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	if (pages <= 1) return null;
	const safePage = Math.min(page, pages);
	return (
		<div className="flex shrink-0 items-center justify-between border-t border-border/40 px-3 py-2">
			<span className="text-xs text-medium-emphasis">
				{(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, total)} of {total}
			</span>
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					disabled={safePage === 1}
					onClick={() => onChange(safePage - 1)}
					aria-label="Previous page"
				>
					<ChevronLeft />
				</Button>
				<span className="min-w-12 text-center text-xs text-medium-emphasis">
					{safePage} / {pages}
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					disabled={safePage === pages}
					onClick={() => onChange(safePage + 1)}
					aria-label="Next page"
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}

export function DataPanel({ loading = false, symbol }: DataPanelProps) {
	const { authenticated, verified } = useAuth();
	const { markets } = useMarkets();
	const [searchParams, setSearchParams] = useSearchParams();
	const [pendingCancelOrder, setPendingCancelOrder] = useState<OrderRecord | null>(null);
	const activityParam = searchParams.get("activity");
	const tab: Tab = ["balance", "open", "orders", "trades"].includes(activityParam ?? "")
		? (activityParam as Tab)
		: "open";
	const search = searchParams.get("q") ?? "";
	const marketParam = searchParams.get("market");
	const currentMarketOnly = Boolean(symbol) && (marketParam === null || marketParam === "current");
	const marketFilter = currentMarketOnly ? "all" : (marketParam ?? "all");
	const sideParam = searchParams.get("side");
	const sideFilter: SideFilter = ["BUY", "SELL"].includes(sideParam ?? "")
		? (sideParam as SideFilter)
		: "all";
	const typeParam = searchParams.get("type");
	const typeFilter: TypeFilter = ["LIMIT", "MARKET"].includes(typeParam ?? "")
		? (typeParam as TypeFilter)
		: "all";
	const statusParam = searchParams.get("status");
	const statusFilter: StatusFilter = ["OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"].includes(
		statusParam ?? "",
	)
		? (statusParam as StatusFilter)
		: "all";
	const sortParam = searchParams.get("sort");
	const sortField: SortField = ["price", "quantity"].includes(sortParam ?? "")
		? (sortParam as SortField)
		: "time";
	const sortDirection: SortDirection = searchParams.get("direction") === "asc" ? "asc" : "desc";
	const pageParam = Number(searchParams.get("page"));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const updateView = useCallback(
		(changes: Record<string, string | null>, resetPage = true, replace = false) => {
			setSearchParams((current) => {
				const next = new URLSearchParams(current);
				for (const [key, value] of Object.entries(changes)) {
					if (value === null) next.delete(key);
					else next.set(key, value);
				}
				if (resetPage) next.delete("page");
				return next;
			}, { replace });
		},
		[setSearchParams],
	);
	const {
		balances,
		loading: balanceLoading,
		error: balanceError,
		refresh: refreshBalances,
	} = useBalance({ enabled: authenticated });
	const {
		openOrders,
		loading: openOrdersLoading,
		error: openOrdersError,
		refresh: refreshOpenOrders,
	} = useOpenOrders({ enabled: authenticated });
	const {
		orders,
		loading: ordersLoading,
		error: ordersError,
		refresh: refreshOrders,
	} = useOrderHistory(ORDER_HISTORY_PARAMS, { enabled: authenticated });
	const {
		trades,
		loading: tradesLoading,
		error: tradesError,
		refresh: refreshTrades,
	} = useTradeHistory(100, { enabled: authenticated });
	const cancelOrder = useCancelOrder();
	const cancelling = cancelOrder.isPending ? (cancelOrder.variables ?? null) : null;
	const fetching = openOrdersLoading || ordersLoading || tradesLoading;
	const activeDataError =
		tab === "balance"
			? balanceError
			: tab === "open"
				? openOrdersError
				: tab === "orders"
					? ordersError
					: tradesError;

	const marketFor = useCallback(
		(marketSymbol: string) => markets.find((market) => market.symbol === marketSymbol),
		[markets],
	);

	const matchesMarket = useCallback(
		(marketSymbol: string) => {
			if (currentMarketOnly && symbol && marketSymbol !== symbol) return false;
			if (!currentMarketOnly && marketFilter !== "all" && marketSymbol !== marketFilter)
				return false;
			return marketSymbol.toLowerCase().includes(search.trim().toLowerCase());
		},
		[currentMarketOnly, marketFilter, search, symbol],
	);

	const filteredOpenOrders = useMemo(
		() =>
			sortRows(
				openOrders.filter(
					(order) =>
						matchesMarket(order.symbol) &&
						(sideFilter === "all" || order.side === sideFilter) &&
						(typeFilter === "all" || order.type === typeFilter),
				),
				sortField,
				sortDirection,
			),
		[openOrders, matchesMarket, sideFilter, typeFilter, sortField, sortDirection],
	);

	const filteredOrders = useMemo(
		() =>
			sortRows(
				orders.filter(
					(order) =>
						matchesMarket(order.symbol) &&
						(sideFilter === "all" || order.side === sideFilter) &&
						(typeFilter === "all" || order.type === typeFilter) &&
						(statusFilter === "all" || order.status === statusFilter),
				),
				sortField,
				sortDirection,
			),
		[orders, matchesMarket, sideFilter, typeFilter, statusFilter, sortField, sortDirection],
	);

	const filteredTrades = useMemo(
		() =>
			sortRows(
				trades.filter(
					(trade) =>
						matchesMarket(trade.symbol) && (sideFilter === "all" || trade.side === sideFilter),
				),
				sortField,
				sortDirection,
			),
		[trades, matchesMarket, sideFilter, sortField, sortDirection],
	);

	const balanceEntries = useMemo(
		() =>
			Object.entries(balances).filter(
				([, balance]) => Number(balance.available) > 0 || Number(balance.locked) > 0,
			),
		[balances],
	);

	const assetPrecision = (asset: string) => {
		const market = markets.find((item) => item.baseAsset === asset || item.quoteAsset === asset);
		if (!market) return 4;
		return market.baseAsset === asset ? market.qtyPrecision : market.pricePrecision;
	};

	const resetFilters = () => {
		updateView({ market: currentMarketOnly ? "current" : "all", side: null, type: null, status: null });
	};

	const handleSort = (field: SortField) => {
		if (field === sortField) {
			updateView({ direction: sortDirection === "desc" ? "asc" : null });
			return;
		}
		updateView({ sort: field === "time" ? null : field, direction: null });
	};

	const handleCancel = async () => {
		if (!verified || !pendingCancelOrder) return;
		try {
			await cancelOrder.mutateAsync(pendingCancelOrder.id);
			toast.success("Order cancelled");
			setPendingCancelOrder(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to cancel order");
		}
	};

	const tabs: { key: Tab; label: string; count?: number }[] = [
		{ key: "balance", label: "Balances" },
		{ key: "open", label: "Open Orders", count: openOrders.length },
		{ key: "orders", label: "Order History", count: orders.length },
		{ key: "trades", label: "Trade History", count: trades.length },
	];
	const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		const nextIndex =
			event.key === "Home"
				? 0
				: event.key === "End"
					? tabs.length - 1
					: (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
		const nextTab = tabs[nextIndex]?.key ?? "open";
		updateView({ activity: nextTab === "open" ? null : nextTab });
		document.getElementById(`account-${nextTab}-tab`)?.focus();
	};
	const filtersActive =
		(!currentMarketOnly && marketFilter !== "all") ||
		sideFilter !== "all" ||
		(tab !== "trades" && typeFilter !== "all") ||
		(tab === "orders" && statusFilter !== "all");
	const activeData =
		tab === "open" ? filteredOpenOrders : tab === "orders" ? filteredOrders : filteredTrades;
	const lastPage = Math.max(1, Math.ceil(activeData.length / PAGE_SIZE));
	const safePage = Math.min(page, lastPage);
	const visibleData = activeData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
	const retryActiveData = () => {
		if (tab === "balance") void refreshBalances();
		else if (tab === "open") void refreshOpenOrders();
		else if (tab === "orders") void refreshOrders();
		else void refreshTrades();
	};

	if (!authenticated) {
		return (
			<div className="flex min-h-75 flex-col items-center justify-center gap-3 px-4 text-center">
				<div className="flex size-10 items-center justify-center rounded-full bg-secondary text-medium-emphasis">
					<LockKeyhole className="size-4" />
				</div>
				<div>
					<p className="text-sm font-medium text-high-emphasis">Your account activity</p>
					<p className="mt-1 text-xs text-medium-emphasis">Sign in to view balances and orders.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button asChild size="sm">
						<Link to="/login" state={{ returnTo: symbol ? `/trade/${symbol}` : "/activity" }}>
							Sign in
						</Link>
					</Button>
					<Button asChild size="sm" variant="outline">
						<Link to="/signup" state={{ returnTo: symbol ? `/trade/${symbol}` : "/activity" }}>
							Create account
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-96 flex-col overflow-hidden sm:min-h-120 lg:min-h-144">
			<div className="flex shrink-0 flex-col items-stretch gap-2 border-b border-border/40 px-3 py-2 sm:flex-row sm:items-center">
				<div
					className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto"
					role="tablist"
					aria-label="Account data"
				>
					{tabs.map((item, index) => (
						<button
							key={item.key}
							id={`account-${item.key}-tab`}
							type="button"
							role="tab"
							aria-selected={tab === item.key}
							aria-controls="account-data-panel"
							onClick={() => updateView({ activity: item.key === "open" ? null : item.key })}
							onKeyDown={(event) => handleTabKeyDown(event, index)}
							tabIndex={tab === item.key ? 0 : -1}
							className={cn(
								"flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
								tab === item.key
									? "bg-muted text-high-emphasis"
									: "text-medium-emphasis hover:text-high-emphasis",
							)}
						>
							{item.label}
							{item.count !== undefined && item.count > 0 && (
								<span className="text-[10px] text-low-emphasis">({item.count})</span>
							)}
						</button>
					))}
				</div>

				{tab !== "balance" && (
					<div className="flex min-w-0 w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
						{symbol && (
							<label className="hidden cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-medium-emphasis sm:flex">
								<Checkbox
									className="border-border bg-card"
									checked={currentMarketOnly}
									onCheckedChange={(checked) => {
										updateView({ market: checked === true ? "current" : "all" });
									}}
								/>
								Current market
							</label>
						)}

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant={filtersActive ? "secondary" : "ghost"}
									size="sm"
									className="h-8 px-2 text-xs"
								>
									<SlidersHorizontal /> Filters
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
								<DropdownMenuLabel className="text-xs text-medium-emphasis">
									Market
								</DropdownMenuLabel>
								<DropdownMenuRadioGroup
									value={currentMarketOnly ? symbol : marketFilter}
									onValueChange={(value) => {
										updateView({ market: value === symbol ? "current" : value });
									}}
								>
									<DropdownMenuRadioItem value="all" className="text-xs">
										All markets
									</DropdownMenuRadioItem>
									{markets.map((market) => (
										<DropdownMenuRadioItem
											key={market.symbol}
											value={market.symbol}
											className="text-xs"
										>
											{market.baseAsset}/{market.quoteAsset}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-xs text-medium-emphasis">Side</DropdownMenuLabel>
								<DropdownMenuRadioGroup
									value={sideFilter}
									onValueChange={(value) => updateView({ side: value === "all" ? null : value })}
								>
									{["all", "BUY", "SELL"].map((value) => (
										<DropdownMenuRadioItem key={value} value={value} className="text-xs">
											{titleCase(value)}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
								{tab !== "trades" && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuLabel className="text-xs text-medium-emphasis">
											Order type
										</DropdownMenuLabel>
										<DropdownMenuRadioGroup
											value={typeFilter}
											onValueChange={(value) =>
												updateView({ type: value === "all" ? null : value })
											}
										>
											{["all", "LIMIT", "MARKET"].map((value) => (
												<DropdownMenuRadioItem key={value} value={value} className="text-xs">
													{titleCase(value)}
												</DropdownMenuRadioItem>
											))}
										</DropdownMenuRadioGroup>
									</>
								)}
								{tab === "orders" && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuLabel className="text-xs text-medium-emphasis">
											Status
										</DropdownMenuLabel>
										<DropdownMenuRadioGroup
											value={statusFilter}
											onValueChange={(value) =>
												updateView({ status: value === "all" ? null : value })
											}
										>
											{["all", "OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"].map((value) => (
												<DropdownMenuRadioItem key={value} value={value} className="text-xs">
													{titleCase(value)}
												</DropdownMenuRadioItem>
											))}
										</DropdownMenuRadioGroup>
									</>
								)}
								{filtersActive && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem onSelect={resetFilters} className="text-xs">
											Clear filters
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>

						<div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
							<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-low-emphasis" />
							<Input
								value={search}
								onChange={(event) =>
									updateView({ q: event.target.value || null }, true, true)
								}
								name="account-market-search"
								aria-label="Search markets"
								autoComplete="off"
								placeholder="Search markets…"
								className="h-8 rounded-md pl-8 pr-7 text-xs"
							/>
							{search && (
								<button
									type="button"
									onClick={() => updateView({ q: null }, true, true)}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-low-emphasis outline-none hover:text-high-emphasis focus-visible:ring-2 focus-visible:ring-ring"
									aria-label="Clear search"
								>
									<X className="size-3.5" />
								</button>
							)}
						</div>
					</div>
				)}
			</div>

			<div
				id="account-data-panel"
				role="tabpanel"
				aria-labelledby={`account-${tab}-tab`}
				className="min-h-0 flex-1 overflow-auto"
			>
				{loading || fetching || (tab === "balance" && balanceLoading) ? (
					<TableLoading
						columns={tab === "balance" ? 4 : tab === "trades" ? 7 : tab === "open" ? 10 : 9}
					/>
				) : activeDataError ? (
					<ErrorState
						onRetry={retryActiveData}
						message={
							activeDataError instanceof Error
								? activeDataError.message
								: "Please try again in a moment."
						}
					/>
				) : tab === "balance" ? (
					<BalanceTable entries={balanceEntries} precisionFor={assetPrecision} />
				) : visibleData.length === 0 ? (
					<EmptyState>
						{search || filtersActive || currentMarketOnly
							? "No results match the current filters"
							: `No ${tab === "open" ? "open orders" : tab === "orders" ? "order history" : "trade history"}`}
					</EmptyState>
				) : tab === "trades" ? (
					<TradeHistoryTable
						trades={visibleData as UserTrade[]}
						marketFor={marketFor}
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={handleSort}
					/>
				) : (
					<OrderTable
						orders={visibleData as OrderRecord[]}
						marketFor={marketFor}
						open={tab === "open"}
						cancelling={cancelling}
						canCancel={verified}
						onCancel={setPendingCancelOrder}
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={handleSort}
					/>
				)}
			</div>

			{tab !== "balance" && (
				<Pagination
					page={safePage}
					total={activeData.length}
					onChange={(nextPage) => updateView({ page: nextPage === 1 ? null : String(nextPage) }, false)}
				/>
			)}

			<ConfirmDialog
				open={pendingCancelOrder !== null}
				onOpenChange={(open) => !open && setPendingCancelOrder(null)}
				title="Cancel this order?"
				description={
					pendingCancelOrder
						? `Cancel the ${titleCase(pendingCancelOrder.side)} ${pendingCancelOrder.symbol.replace("_", "/")} order. Any unfilled quantity will be released.`
						: "This order will be cancelled."
				}
				confirmLabel="Cancel order"
				cancelLabel="Keep order"
				pendingLabel="Cancelling…"
				pending={cancelOrder.isPending}
				onConfirm={() => void handleCancel()}
			/>
		</div>
	);
}

type MarketLookup = ReturnType<typeof useMarkets>["markets"][number] | undefined;

function OrderTable({
	orders,
	marketFor,
	open,
	cancelling,
	canCancel,
	onCancel,
	sortField,
	sortDirection,
	onSort,
}: {
	orders: OrderRecord[];
	marketFor: (symbol: string) => MarketLookup;
	open: boolean;
	cancelling: string | null;
	canCancel: boolean;
	onCancel: (order: OrderRecord) => void;
	sortField: SortField;
	sortDirection: SortDirection;
	onSort: (field: SortField) => void;
}) {
	return (
		<Table className="table-fixed min-w-260">
			<colgroup>
				<col className="w-36" />
				<col className="w-20" />
				<col className="w-18" />
				<col className="w-28" />
				<col className="w-28" />
				<col className="w-36" />
				{!open && <col className="w-28" />}
				<col className="w-28" />
				<col className="w-36" />
				{open && <col className="w-24" />}
			</colgroup>
			<TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-card">
				<TableRow className="hover:bg-transparent">
					<TableHead className="px-3">Market</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Side</TableHead>
					<SortableHead
						field="price"
						label="Price"
						activeField={sortField}
						direction={sortDirection}
						onSort={onSort}
						className="text-right"
					/>
					<SortableHead
						field="quantity"
						label="Qty"
						activeField={sortField}
						direction={sortDirection}
						onSort={onSort}
						className="text-right"
					/>
					<TableHead className="text-right">Filled / Total</TableHead>
					{!open && <TableHead className="text-right">Avg Price</TableHead>}
					<TableHead className="text-right">Status</TableHead>
					<SortableHead
						field="time"
						label="Time"
						activeField={sortField}
						direction={sortDirection}
						onSort={onSort}
						className={cn("text-right", !open && "px-3")}
					/>
					{open && <TableHead className="px-3 text-right">Action</TableHead>}
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => {
					const market = marketFor(order.symbol);
					return (
						<TableRow key={order.id}>
							<MarketCell symbol={order.symbol} market={market} />
							<TableCell className="font-normal text-medium-emphasis">
								{titleCase(order.type)}
							</TableCell>
							<TableCell className={sideClass(order.side)}>{titleCase(order.side)}</TableCell>
							<TableCell className="text-right">
								{order.type === "MARKET"
									? "Market"
									: formatPrice(order.price, market?.pricePrecision)}
							</TableCell>
							<TableCell className="text-right">
								{formatQty(order.qty, market?.qtyPrecision)}
							</TableCell>
							<TableCell className="text-right">
								{formatQty(order.filledQty, market?.qtyPrecision)} /{" "}
								{formatQty(order.qty, market?.qtyPrecision)}
							</TableCell>
							{!open && (
								<TableCell className="text-right">
									{formatPrice(order.averagePrice, market?.pricePrecision)}
								</TableCell>
							)}
							<TableCell className={cn("text-right", orderStatusClass(order.status))}>
								{titleCase(order.status)}
							</TableCell>
							<TableCell
								className={cn(
									"text-right text-xs font-normal text-medium-emphasis",
									!open && "px-3",
								)}
							>
								{formatDateTime(order.createdAt)}
							</TableCell>
							{open && (
								<TableCell className="text-right">
									<Button
										type="button"
										variant="ghost"
										size="xs"
										disabled={!canCancel || cancelling === order.id}
										onClick={() => onCancel(order)}
										className="text-medium-emphasis hover:bg-red-bg/40 hover:text-red-text"
									>
										{cancelling === order.id ? "Cancelling…" : "Cancel"}
									</Button>
								</TableCell>
							)}
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function TradeHistoryTable({
	trades,
	marketFor,
	sortField,
	sortDirection,
	onSort,
}: {
	trades: UserTrade[];
	marketFor: (symbol: string) => MarketLookup;
	sortField: SortField;
	sortDirection: SortDirection;
	onSort: (field: SortField) => void;
}) {
	return (
		<Table className="table-fixed min-w-208">
			<colgroup>
				<col className="w-36" />
				<col className="w-18" />
				<col className="w-28" />
				<col className="w-28" />
				<col className="w-28" />
				<col className="w-24" />
				<col className="w-40" />
			</colgroup>
			<TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-card">
				<TableRow className="hover:bg-transparent">
					<TableHead className="px-3">Market</TableHead>
					<TableHead>Side</TableHead>
					<SortableHead
						field="price"
						label="Price"
						activeField={sortField}
						direction={sortDirection}
						onSort={onSort}
						className="text-right"
					/>
					<SortableHead
						field="quantity"
						label="Qty"
						activeField={sortField}
						direction={sortDirection}
						onSort={onSort}
						className="text-right"
					/>
					<TableHead className="text-right">Value</TableHead>
					<TableHead className="text-right">Liquidity</TableHead>
					<SortableHead
						field="time"
						label="Time"
						activeField={sortField}
						direction={sortDirection}
						onSort={onSort}
						className="px-3 text-right"
					/>
				</TableRow>
			</TableHeader>
			<TableBody>
				{trades.map((trade) => {
					const market = marketFor(trade.symbol);
					return (
						<TableRow key={trade.id}>
							<MarketCell symbol={trade.symbol} market={market} />
							<TableCell className={sideClass(trade.side)}>{titleCase(trade.side)}</TableCell>
							<TableCell className="text-right">
								{formatPrice(trade.price, market?.pricePrecision)}
							</TableCell>
							<TableCell className="text-right">
								{formatQty(trade.qty, market?.qtyPrecision)}
							</TableCell>
							<TableCell className="text-right">
								{formatPrice(Number(trade.price) * Number(trade.qty), market?.pricePrecision)}
							</TableCell>
							<TableCell className="text-right font-normal text-medium-emphasis">
								{trade.isMaker ? "Maker" : "Taker"}
							</TableCell>
							<TableCell className="px-3 text-right text-xs font-normal text-medium-emphasis">
								{formatDateTime(trade.createdAt)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function BalanceTable({
	entries,
	precisionFor,
}: {
	entries: [string, UserBalance[string]][];
	precisionFor: (asset: string) => number;
}) {
	if (entries.length === 0) return <EmptyState>No balances found</EmptyState>;
	return (
		<Table className="table-fixed min-w-140">
			<colgroup>
				<col className="w-36" />
				<col className="w-32" />
				<col className="w-32" />
				<col className="w-32" />
			</colgroup>
			<TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-card">
				<TableRow className="hover:bg-transparent">
					<TableHead className="px-3">Asset</TableHead>
					<TableHead className="text-right">Available</TableHead>
					<TableHead className="text-right">Locked</TableHead>
					<TableHead className="px-3 text-right">Total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{entries.map(([asset, balance]) => {
					const precision = precisionFor(asset);
					const available = Number(balance.available ?? 0);
					const locked = Number(balance.locked ?? 0);
					return (
						<TableRow key={asset}>
							<TableCell className="px-3">
								<div className="flex items-center gap-2">
									<AssetIcon asset={asset} className="size-6 shrink-0" />
									<span>{asset}</span>
								</div>
							</TableCell>
							<TableCell className="text-right">{formatQty(available, precision)}</TableCell>
							<TableCell
								className={cn("text-right", locked === 0 && "font-normal text-medium-emphasis")}
							>
								{formatQty(locked, precision)}
							</TableCell>
							<TableCell className="px-3 text-right">
								{formatQty(available + locked, precision)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
