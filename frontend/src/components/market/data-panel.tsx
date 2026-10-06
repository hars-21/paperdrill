import { useCallback, useMemo, useState } from "react";
import {
	ArrowUpRight,
	ArrowDown10,
	ArrowUp01,
	ArrowUpDown,
	Check,
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
import type { OrderRecord, UserTrade } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import {
	useCancelOrder,
	useOpenOrders,
	useOrderHistory,
	useTradeHistory,
} from "@/hooks/use-account";
import { useBalance } from "@/hooks/use-balance";
import { usePortfolio } from "@/hooks/use-portfolio";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";
import { AssetIcon, assetNames } from "../icons/asset-icon";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "../ui/sheet";
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

type BalanceDetail = {
	asset: string;
	available: string;
	locked: string;
	total: string;
	precision: number;
	markPrice: string | null;
	value: string | null;
	allocation: number | null;
	marketSymbol: string | null;
};

const PAGE_SIZE = 10;
const ORDER_HISTORY_PARAMS = { limit: 100 } as const;
const FILTER_OPTION_CLASS_NAME =
	"min-h-9 cursor-pointer rounded-lg border border-transparent px-2.5 py-2 pl-2.5 text-xs data-[state=checked]:border-border/70 data-[state=checked]:bg-l2 data-[state=checked]:text-high-emphasis [&>span:first-child]:hidden";

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

function EmptyState({ title, description }: { title: string; description: string }) {
	return (
		<div
			role="status"
			className="flex h-full min-h-48 items-center justify-center px-5 py-8 sm:px-8"
		>
			<div className="flex w-full max-w-md items-start gap-4 text-left">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-l2/50 text-medium-emphasis shadow-xs">
					<Inbox className="size-4" />
				</div>
				<div className="pt-0.5">
					<p className="text-sm font-semibold text-high-emphasis">{title}</p>
					<p className="mt-1 max-w-sm text-xs leading-5 text-medium-emphasis">{description}</p>
				</div>
			</div>
		</div>
	);
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div role="alert" className="flex min-h-48 items-center justify-center px-5 py-8 sm:px-8">
			<div className="flex w-full max-w-md items-start gap-4 text-left">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-l2/50 text-red-text shadow-xs">
					<CircleAlert className="size-4" />
				</div>
				<div className="pt-0.5">
					<p className="text-sm font-semibold text-high-emphasis">Could not load account data</p>
					<p className="mt-1 max-w-sm text-xs leading-5 text-medium-emphasis">{message}</p>
					<Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3">
						Try again
					</Button>
				</div>
			</div>
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

function ActivityFilters({
	markets,
	symbol,
	currentMarketOnly,
	marketFilter,
	sideFilter,
	typeFilter,
	statusFilter,
	tab,
	filtersActive,
	onChange,
	onReset,
}: {
	markets: ReturnType<typeof useMarkets>["markets"];
	symbol?: string;
	currentMarketOnly: boolean;
	marketFilter: string;
	sideFilter: SideFilter;
	typeFilter: TypeFilter;
	statusFilter: StatusFilter;
	tab: Tab;
	filtersActive: boolean;
	onChange: (changes: Record<string, string | null>) => void;
	onReset: () => void;
}) {
	const marketValue = currentMarketOnly && symbol ? symbol : marketFilter;
	const filterCount =
		Number(symbol ? !currentMarketOnly : marketFilter !== "all") +
		Number(sideFilter !== "all") +
		Number(tab !== "trades" && typeFilter !== "all") +
		Number(tab === "orders" && statusFilter !== "all");
	const scopeLabel =
		currentMarketOnly && symbol
			? symbol.replace("_", "/")
			: marketFilter === "all"
				? "All markets"
				: marketFilter.replace("_", "/");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className={cn(
						"h-9 max-w-40 gap-2 rounded-lg border-border/60 bg-l1 px-2.5 text-xs shadow-none",
						filtersActive && "bg-l2",
					)}
				>
					<SlidersHorizontal className="size-3.5" />
					<span className="truncate">{scopeLabel}</span>
					{filterCount > 0 ? (
						<span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
							{filterCount}
						</span>
					) : null}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border-border/60 bg-l1 p-0 shadow-xl"
			>
				<div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
					<div>
						<p className="text-sm font-semibold text-high-emphasis">Filter activity</p>
						<p className="mt-0.5 text-xs text-medium-emphasis">Changes apply immediately</p>
					</div>
					{filtersActive ? (
						<button
							type="button"
							onClick={onReset}
							className="rounded-md px-2 py-1 text-xs font-medium text-medium-emphasis outline-none transition-colors hover:bg-l2 hover:text-high-emphasis focus-visible:ring-2 focus-visible:ring-ring"
						>
							Reset
						</button>
					) : null}
				</div>

				<div className="max-h-[min(26rem,70vh)] space-y-4 overflow-y-auto p-3">
					<div>
						<p className="mb-2 px-1 text-xs font-medium text-medium-emphasis">Market</p>
						<DropdownMenuRadioGroup
							value={marketValue}
							onValueChange={(value) => onChange({ market: value === symbol ? "current" : value })}
							className="space-y-1"
						>
							<DropdownMenuRadioItem
								value="all"
								onSelect={(event) => event.preventDefault()}
								className={FILTER_OPTION_CLASS_NAME}
							>
								<span className="flex-1">All markets</span>
								{marketValue === "all" ? <Check className="size-3.5 text-primary" /> : null}
							</DropdownMenuRadioItem>
							{markets.map((market) => (
								<DropdownMenuRadioItem
									key={market.symbol}
									value={market.symbol}
									onSelect={(event) => event.preventDefault()}
									className={FILTER_OPTION_CLASS_NAME}
								>
									<AssetIcon asset={market.baseAsset} className="size-5" />
									<span className="flex-1">
										{market.baseAsset}/{market.quoteAsset}
									</span>
									{marketValue === market.symbol ? (
										<Check className="size-3.5 text-primary" />
									) : null}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</div>

					<FilterGroup label="Side">
						<DropdownMenuRadioGroup
							value={sideFilter}
							onValueChange={(value) => onChange({ side: value === "all" ? null : value })}
							className="grid grid-cols-3 gap-1"
						>
							{["all", "BUY", "SELL"].map((value) => (
								<DropdownMenuRadioItem
									key={value}
									value={value}
									onSelect={(event) => event.preventDefault()}
									className={cn(FILTER_OPTION_CLASS_NAME, "justify-center")}
								>
									{titleCase(value)}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</FilterGroup>

					{tab !== "trades" ? (
						<FilterGroup label="Order type">
							<DropdownMenuRadioGroup
								value={typeFilter}
								onValueChange={(value) => onChange({ type: value === "all" ? null : value })}
								className="grid grid-cols-3 gap-1"
							>
								{["all", "LIMIT", "MARKET"].map((value) => (
									<DropdownMenuRadioItem
										key={value}
										value={value}
										onSelect={(event) => event.preventDefault()}
										className={cn(FILTER_OPTION_CLASS_NAME, "justify-center")}
									>
										{titleCase(value)}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</FilterGroup>
					) : null}

					{tab === "orders" ? (
						<FilterGroup label="Status">
							<DropdownMenuRadioGroup
								value={statusFilter}
								onValueChange={(value) => onChange({ status: value === "all" ? null : value })}
								className="grid grid-cols-2 gap-1"
							>
								{["all", "OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"].map((value) => (
									<DropdownMenuRadioItem
										key={value}
										value={value}
										onSelect={(event) => event.preventDefault()}
										className={cn(FILTER_OPTION_CLASS_NAME, "justify-center")}
									>
										{titleCase(value)}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</FilterGroup>
					) : null}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="border-t border-border/40 pt-4">
			<p className="mb-2 px-1 text-xs font-medium text-medium-emphasis">{label}</p>
			{children}
		</div>
	);
}

export function DataPanel({ loading = false, symbol }: DataPanelProps) {
	const { authenticated, verified } = useAuth();
	const { markets } = useMarkets();
	const [searchParams, setSearchParams] = useSearchParams();
	const [pendingCancelOrder, setPendingCancelOrder] = useState<OrderRecord | null>(null);
	const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
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
			setSearchParams(
				(current) => {
					const next = new URLSearchParams(current);
					for (const [key, value] of Object.entries(changes)) {
						if (value === null) next.delete(key);
						else next.set(key, value);
					}
					if (resetPage) next.delete("page");
					return next;
				},
				{ replace },
			);
		},
		[setSearchParams],
	);
	const {
		balances,
		loading: balanceLoading,
		error: balanceError,
		refresh: refreshBalances,
	} = useBalance({ enabled: authenticated });
	const { portfolio } = usePortfolio({ enabled: authenticated });
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
	const activeDataLoading =
		tab === "balance"
			? balanceLoading
			: tab === "open"
				? openOrdersLoading
				: tab === "orders"
					? ordersLoading
					: tradesLoading;
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

	const precisionForAsset = useCallback(
		(asset: string) => {
			const market = markets.find((item) => item.baseAsset === asset || item.quoteAsset === asset);
			if (!market) return 4;
			return market.baseAsset === asset ? market.qtyPrecision : market.pricePrecision;
		},
		[markets],
	);

	const balanceDetails = useMemo<BalanceDetail[]>(() => {
		const positions = new Map(portfolio?.positions.map((position) => [position.asset, position]));
		const portfolioEquity = Number(portfolio?.equity ?? 0);
		return Object.entries(balances)
			.filter(([, balance]) => Number(balance.available) > 0 || Number(balance.locked) > 0)
			.map(([asset, balance]) => {
				const position = positions.get(asset);
				const available = balance.available ?? "0";
				const locked = balance.locked ?? "0";
				const value = position?.value ?? null;
				return {
					asset,
					available,
					locked,
					total: String(Number(available) + Number(locked)),
					precision: precisionForAsset(asset),
					markPrice: position?.markPrice ?? null,
					value,
					allocation: value && portfolioEquity > 0 ? (Number(value) / portfolioEquity) * 100 : null,
					marketSymbol: markets.find((market) => market.baseAsset === asset)?.symbol ?? null,
				};
			})
			.sort((left, right) => {
				if (left.asset === portfolio?.quoteAsset) return -1;
				if (right.asset === portfolio?.quoteAsset) return 1;
				return Number(right.value ?? 0) - Number(left.value ?? 0);
			});
	}, [balances, markets, portfolio, precisionForAsset]);
	const selectedBalance = balanceDetails.find((entry) => entry.asset === selectedAsset) ?? null;

	const resetFilters = () => {
		updateView({ market: symbol ? "current" : "all", side: null, type: null, status: null });
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
		{ key: "open", label: "Open orders", count: openOrders.length },
		{ key: "orders", label: "Order history", count: orders.length },
		{ key: "trades", label: "Trade history", count: trades.length },
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
		(symbol ? !currentMarketOnly : marketFilter !== "all") ||
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
	const emptyState =
		search || filtersActive
			? {
					title: "No matching activity",
					description: "Try clearing the search or changing the active filters.",
				}
			: tab === "open"
				? {
						title: "No open orders",
						description:
							currentMarketOnly && symbol
								? `Orders you place on ${symbol.replace("_", "/")} will appear here until they fill or are cancelled.`
								: "Orders you place will appear here until they fill or are cancelled.",
					}
				: tab === "orders"
					? {
							title: "No order history yet",
							description:
								currentMarketOnly && symbol
									? `Completed and cancelled ${symbol.replace("_", "/")} orders will be recorded here.`
									: "Completed and cancelled orders will be recorded here.",
						}
					: {
							title: "No trades yet",
							description:
								currentMarketOnly && symbol
									? `Your completed ${symbol.replace("_", "/")} trades will be recorded here.`
									: "Your completed trades will be recorded here.",
						};
	const emptyView =
		!loading &&
		!activeDataLoading &&
		!activeDataError &&
		(tab === "balance" ? balanceDetails.length === 0 : visibleData.length === 0);

	if (loading && !authenticated) {
		return (
			<div className="flex min-h-80 flex-col bg-l1">
				<div className="flex items-center justify-between border-b border-border/40 px-4 py-3.5 sm:px-5">
					<div>
						<Skeleton className="h-3.5 w-28" />
						<Skeleton className="mt-2 h-3 w-44" />
					</div>
					<Skeleton className="size-8 rounded-lg" />
				</div>
				<div className="flex flex-1 items-center px-5 py-8 sm:px-8">
					<div className="flex w-full max-w-md items-start gap-4">
						<Skeleton className="size-10 shrink-0 rounded-xl" />
						<div className="flex-1 pt-0.5">
							<Skeleton className="h-4 w-36" />
							<Skeleton className="mt-2 h-3 w-full max-w-72" />
							<Skeleton className="mt-4 h-8 w-24 rounded-lg" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!authenticated) {
		return (
			<div className="flex min-h-80 flex-col bg-l1">
				<div className="flex items-center justify-between border-b border-border/40 px-4 py-3.5 sm:px-5">
					<div>
						<p className="text-sm font-semibold text-high-emphasis">Account activity</p>
						<p className="mt-0.5 text-xs text-medium-emphasis">Balances, orders and trades</p>
					</div>
				</div>
				<div className="flex flex-1 items-center px-5 py-8 sm:px-8">
					<div className="flex w-full max-w-lg items-start gap-4">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-l2/50 text-medium-emphasis shadow-xs">
							<LockKeyhole className="size-4" />
						</div>
						<div className="pt-0.5">
							<p className="text-sm font-semibold text-high-emphasis">
								Sign in to see your workspace
							</p>
							<p className="mt-1 max-w-sm text-xs leading-5 text-medium-emphasis">
								Your balances, open orders and complete trading history stay attached to your
								account.
							</p>
							<div className="mt-4 flex flex-wrap items-center gap-2">
								<Button asChild size="sm">
									<Link to="/login" state={{ returnTo: symbol ? `/trade/${symbol}` : "/activity" }}>
										Sign in
									</Link>
								</Button>
								<Button asChild size="sm" variant="outline">
									<Link
										to="/signup"
										state={{ returnTo: symbol ? `/trade/${symbol}` : "/activity" }}
									>
										Create account
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex h-full flex-col overflow-hidden bg-l1",
				emptyView ? "min-h-80" : "min-h-112 sm:min-h-128",
			)}
		>
			<div className="shrink-0 border-b border-border/40 px-4 sm:px-5 xl:flex xl:items-center xl:gap-4">
				<div
					className="no-scrollbar flex min-w-0 items-center gap-5 overflow-x-auto"
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
								"flex h-11 cursor-pointer items-center gap-1.5 border-b-2 px-0 text-[13px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								tab === item.key
									? "border-primary text-high-emphasis"
									: "border-transparent text-medium-emphasis hover:border-border hover:text-high-emphasis",
							)}
						>
							{item.label}
							{item.count !== undefined && item.count > 0 ? (
								<span className="text-[10px] font-medium tabular-nums text-low-emphasis">
									{item.count}
								</span>
							) : null}
						</button>
					))}
				</div>

				{tab !== "balance" ? (
					<div className="flex min-w-0 items-center gap-2 border-t border-border/40 py-2 xl:ml-auto xl:border-t-0 xl:py-0">
						<ActivityFilters
							markets={markets}
							symbol={symbol}
							currentMarketOnly={currentMarketOnly}
							marketFilter={marketFilter}
							sideFilter={sideFilter}
							typeFilter={typeFilter}
							statusFilter={statusFilter}
							tab={tab}
							filtersActive={filtersActive}
							onChange={(changes) => updateView(changes)}
							onReset={resetFilters}
						/>

						<div className="relative min-w-0 flex-1 xl:w-44 xl:flex-none">
							<Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-low-emphasis" />
							<Input
								value={search}
								onChange={(event) => updateView({ q: event.target.value || null }, true, true)}
								name="account-market-search"
								aria-label="Search markets"
								autoComplete="off"
								placeholder="Search market"
								className="h-9 rounded-lg border-border/60 bg-l1 pr-8 pl-9 text-xs shadow-none"
							/>
							{search ? (
								<button
									type="button"
									onClick={() => updateView({ q: null }, true, true)}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-low-emphasis outline-none hover:text-high-emphasis focus-visible:ring-2 focus-visible:ring-ring"
									aria-label="Clear search"
								>
									<X className="size-3.5" />
								</button>
							) : null}
						</div>
					</div>
				) : null}
			</div>

			<div
				id="account-data-panel"
				role="tabpanel"
				aria-labelledby={`account-${tab}-tab`}
				className="min-h-0 flex-1 overflow-auto"
			>
				{loading || activeDataLoading ? (
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
					<BalanceLedger
						entries={balanceDetails}
						quoteAsset={portfolio?.quoteAsset ?? "USD"}
						portfolioValue={portfolio?.equity ?? null}
						onSelect={setSelectedAsset}
					/>
				) : visibleData.length === 0 ? (
					<EmptyState title={emptyState.title} description={emptyState.description} />
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
					onChange={(nextPage) =>
						updateView({ page: nextPage === 1 ? null : String(nextPage) }, false)
					}
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

			<AssetDetailsSheet
				detail={selectedBalance}
				quoteAsset={portfolio?.quoteAsset ?? "USD"}
				open={selectedBalance !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedAsset(null);
				}}
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
			<TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-l1">
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
						<TableRow key={order.id} className="hover:bg-l2/40">
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
			<TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-l1">
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
						<TableRow key={trade.id} className="hover:bg-l2/40">
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

function BalanceLedger({
	entries,
	quoteAsset,
	portfolioValue,
	onSelect,
}: {
	entries: BalanceDetail[];
	quoteAsset: string;
	portfolioValue: string | null;
	onSelect: (asset: string) => void;
}) {
	if (entries.length === 0) {
		return (
			<EmptyState
				title="No funded balances"
				description="Credits and assets held in your account will appear here."
			/>
		);
	}

	return (
		<div>
			<div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-5">
				<div>
					<p className="font-semibold text-high-emphasis">Asset balances</p>
					<p className="mt-1 text-xs text-medium-emphasis">
						{entries.length} {entries.length === 1 ? "asset" : "assets"}. Select one for full
						details.
					</p>
				</div>
				{portfolioValue ? (
					<div className="text-left sm:text-right">
						<p className="text-xs text-medium-emphasis">Portfolio value</p>
						<p className="mt-1 font-semibold text-high-emphasis tabular-nums">
							{formatPrice(portfolioValue)} {quoteAsset}
						</p>
					</div>
				) : null}
			</div>

			<div className="hidden grid-cols-[minmax(10rem,1.4fr)_repeat(3,minmax(7rem,1fr))_minmax(8rem,1fr)_1.5rem] gap-3 border-b border-border/40 bg-l2/50 px-4 py-2.5 text-xs text-medium-emphasis md:grid md:px-5">
				<span>Asset</span>
				<span className="text-right">Available</span>
				<span className="text-right">Locked</span>
				<span className="text-right">Total</span>
				<span className="text-right">Value</span>
				<span />
			</div>

			<div className="divide-y divide-border/30">
				{entries.map((entry) => (
					<button
						key={entry.asset}
						type="button"
						onClick={() => onSelect(entry.asset)}
						className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-l2/40 focus-visible:bg-l2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(10rem,1.4fr)_repeat(3,minmax(7rem,1fr))_minmax(8rem,1fr)_1.5rem] md:px-5"
						aria-label={`View ${assetNames[entry.asset] ?? entry.asset} balance details`}
					>
						<div className="flex min-w-0 items-center gap-3">
							<AssetIcon asset={entry.asset} className="size-9 shrink-0" />
							<div className="min-w-0">
								<p className="font-semibold text-high-emphasis">{entry.asset}</p>
								<p className="truncate text-xs text-medium-emphasis">
									{assetNames[entry.asset] ?? entry.asset}
								</p>
							</div>
						</div>
						<p className="hidden text-right text-sm font-medium text-high-emphasis tabular-nums md:block">
							{formatQty(entry.available, entry.precision)}
						</p>
						<p
							className={cn(
								"hidden text-right text-sm tabular-nums md:block",
								Number(entry.locked) === 0
									? "text-medium-emphasis"
									: "font-medium text-high-emphasis",
							)}
						>
							{formatQty(entry.locked, entry.precision)}
						</p>
						<p className="hidden text-right text-sm font-semibold text-high-emphasis tabular-nums md:block">
							{formatQty(entry.total, entry.precision)}
						</p>
						<p className="hidden text-right text-sm font-medium text-high-emphasis tabular-nums md:block">
							{entry.value ? `${formatPrice(entry.value)} ${quoteAsset}` : "-"}
						</p>
						<div className="flex items-center gap-3 md:hidden">
							<div className="text-right">
								<p className="text-sm font-semibold text-high-emphasis tabular-nums">
									{formatQty(entry.total, entry.precision)}
								</p>
								<p className="mt-0.5 text-xs text-medium-emphasis tabular-nums">
									{entry.value ? `${formatPrice(entry.value)} ${quoteAsset}` : "Total"}
								</p>
							</div>
							<ChevronRight className="size-4 text-low-emphasis" />
						</div>
						<ChevronRight className="hidden size-4 justify-self-end text-low-emphasis md:block" />
					</button>
				))}
			</div>
		</div>
	);
}

function AssetDetailsSheet({
	detail,
	quoteAsset,
	open,
	onOpenChange,
}: {
	detail: BalanceDetail | null;
	quoteAsset: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	if (!detail) return null;
	const lockedShare =
		Number(detail.total) > 0 ? (Number(detail.locked) / Number(detail.total)) * 100 : 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 border-border/60 bg-l1 p-0 sm:max-w-md">
				<SheetHeader className="border-b border-border/40 px-5 py-5 pr-14 text-left">
					<div className="flex items-center gap-3">
						<AssetIcon asset={detail.asset} className="size-11" />
						<div>
							<SheetTitle className="text-lg text-high-emphasis">
								{assetNames[detail.asset] ?? detail.asset}
							</SheetTitle>
							<SheetDescription>{detail.asset} balance details</SheetDescription>
						</div>
					</div>
				</SheetHeader>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
					<div>
						<p className="text-xs text-medium-emphasis">Total balance</p>
						<p className="mt-2 text-3xl font-semibold tracking-tight text-high-emphasis tabular-nums">
							{formatQty(detail.total, detail.precision)} {detail.asset}
						</p>
						<p className="mt-1 text-sm text-medium-emphasis tabular-nums">
							{detail.value
								? `${formatPrice(detail.value)} ${quoteAsset}`
								: "Current value unavailable"}
						</p>
					</div>

					<div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border/60">
						<div className="p-4">
							<p className="text-xs text-medium-emphasis">Available</p>
							<p className="mt-1.5 font-semibold text-high-emphasis tabular-nums">
								{formatQty(detail.available, detail.precision)}
							</p>
						</div>
						<div className="border-l border-border/40 p-4">
							<p className="text-xs text-medium-emphasis">In open orders</p>
							<p className="mt-1.5 font-semibold text-high-emphasis tabular-nums">
								{formatQty(detail.locked, detail.precision)}
							</p>
						</div>
					</div>

					<div className="mt-6 divide-y divide-border/40 border-y border-border/40">
						<DetailRow
							label="Mark price"
							value={
								detail.markPrice ? `${formatPrice(detail.markPrice)} ${quoteAsset}` : "Unavailable"
							}
						/>
						<DetailRow
							label="Portfolio allocation"
							value={detail.allocation == null ? "Unavailable" : `${detail.allocation.toFixed(2)}%`}
						/>
						<DetailRow label="Balance reserved" value={`${lockedShare.toFixed(2)}%`} />
					</div>

					<p className="mt-5 text-sm leading-relaxed text-medium-emphasis">
						Available funds can be traded immediately. Reserved funds are held by your open orders
						and return when those orders fill or are cancelled.
					</p>
				</div>

				<SheetFooter className="border-t border-border/40 p-5 sm:flex-row">
					<Button asChild className="h-10 flex-1">
						<Link
							to={detail.marketSymbol ? `/trade/${detail.marketSymbol}` : "/markets"}
							onClick={() => onOpenChange(false)}
						>
							{detail.marketSymbol ? `Trade ${detail.asset}` : "Browse markets"}
							<ArrowUpRight />
						</Link>
					</Button>
					<Button asChild variant="outline" className="h-10 flex-1">
						<Link to="/portfolio" onClick={() => onOpenChange(false)}>
							View portfolio
						</Link>
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 py-3.5 text-sm">
			<span className="text-medium-emphasis">{label}</span>
			<span className="font-medium text-high-emphasis tabular-nums">{value}</span>
		</div>
	);
}
