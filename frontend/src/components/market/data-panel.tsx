import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowDown10,
	ArrowUp01,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { OrderRecord, UserBalance, UserTrade } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useMarkets } from "@/context/MarketContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDateTime, formatPrice, formatQty } from "@/utils/format";
import { AssetIcon } from "../icons/asset-icon";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
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
	refreshKey?: number;
	symbol?: string;
};

const PAGE_SIZE = 10;

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
				className="ml-auto flex cursor-pointer items-center gap-1 text-inherit transition-colors hover:text-high-emphasis"
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
			{Array.from({ length: 5 }).map((_, row) => (
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
		<div className="flex min-h-44 items-center justify-center text-sm text-medium-emphasis">
			{children}
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
				{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} of {total}
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

export function DataPanel({ loading = false, refreshKey, symbol }: DataPanelProps) {
	const { user, verified } = useAuth();
	const { markets } = useMarkets();
	const [tab, setTab] = useState<Tab>("open");
	const [openOrders, setOpenOrders] = useState<OrderRecord[]>([]);
	const [orders, setOrders] = useState<OrderRecord[]>([]);
	const [trades, setTrades] = useState<UserTrade[]>([]);
	const [balances, setBalances] = useState<UserBalance>({});
	const [fetching, setFetching] = useState(true);
	const [cancelling, setCancelling] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [currentMarketOnly, setCurrentMarketOnly] = useState(true);
	const [marketFilter, setMarketFilter] = useState("all");
	const [sideFilter, setSideFilter] = useState<SideFilter>("all");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [sortField, setSortField] = useState<SortField>("time");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [page, setPage] = useState(1);

	const fetchData = useCallback(async () => {
		setFetching(true);
		try {
			const [open, orderHistory, tradeHistory, balance] = await Promise.all([
				api.getOpenOrders(),
				api.getOrders({ limit: 100 }),
				api.getTradeHistory(100),
				api.getBalance(),
			]);
			setOpenOrders(
				open.filter(
					(order, index, list) => index === list.findIndex((item) => item.id === order.id),
				),
			);
			setOrders(orderHistory);
			setTrades(tradeHistory);
			setBalances(balance);
		} catch (error) {
			console.error("Failed to load account data:", error);
			toast.error("Failed to load account data");
		} finally {
			setFetching(false);
		}
	}, []);

	useEffect(() => {
		if (user && verified) fetchData();
	}, [user, verified, refreshKey, fetchData]);

	useEffect(() => {
		setPage(1);
	}, [
		tab,
		search,
		currentMarketOnly,
		marketFilter,
		sideFilter,
		typeFilter,
		statusFilter,
		sortField,
		sortDirection,
	]);

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
		setMarketFilter("all");
		setSideFilter("all");
		setTypeFilter("all");
		setStatusFilter("all");
	};

	const handleSort = (field: SortField) => {
		if (field === sortField) {
			setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
			return;
		}
		setSortField(field);
		setSortDirection("desc");
	};

	const handleCancel = async (orderId: string) => {
		setCancelling(orderId);
		try {
			await api.cancelOrder(orderId);
			toast.success("Order cancelled");
			await fetchData();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to cancel order");
		} finally {
			setCancelling(null);
		}
	};

	const tabs: { key: Tab; label: string; count?: number }[] = [
		{ key: "balance", label: "Balances" },
		{ key: "open", label: "Open Orders", count: openOrders.length },
		{ key: "orders", label: "Order History", count: orders.length },
		{ key: "trades", label: "Trade History", count: trades.length },
	];
	const filtersActive =
		(!currentMarketOnly && marketFilter !== "all") ||
		sideFilter !== "all" ||
		(tab !== "trades" && typeFilter !== "all") ||
		(tab === "orders" && statusFilter !== "all");
	const activeData =
		tab === "open" ? filteredOpenOrders : tab === "orders" ? filteredOrders : filteredTrades;
	const visibleData = activeData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	if (!user) {
		return (
			<div className="flex min-h-75 items-center justify-center text-sm text-high-emphasis">
				Please&nbsp;
				<Link to="/login" className="font-medium text-primary">
					log in
				</Link>
				&nbsp;or&nbsp;
				<Link to="/signup" className="font-medium text-primary">
					sign up
				</Link>
				&nbsp;to view account data.
			</div>
		);
	}

	if (!verified) {
		return (
			<div className="flex min-h-75 items-center justify-center text-sm text-high-emphasis">
				<Link to="/verify-email" className="font-medium text-primary">Verify your email</Link>
				&nbsp;to view account data.
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-144 select-none flex-col overflow-hidden">
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
				<div className="flex min-w-0 items-center gap-1 overflow-x-auto">
					{tabs.map((item) => (
						<button
							key={item.key}
							type="button"
							onClick={() => setTab(item.key)}
							className={cn(
								"flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
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
					<div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial">
						<label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-medium-emphasis">
							<Checkbox
								className="border-border bg-card"
								checked={currentMarketOnly}
								onCheckedChange={(checked) => {
									setCurrentMarketOnly(checked === true);
									if (checked === true) setMarketFilter("all");
								}}
							/>
							Current market
						</label>

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
										setMarketFilter(value);
										setCurrentMarketOnly(false);
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
									onValueChange={(value) => setSideFilter(value as SideFilter)}
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
											onValueChange={(value) => setTypeFilter(value as TypeFilter)}
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
											onValueChange={(value) => setStatusFilter(value as StatusFilter)}
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

						<div className="relative w-36 sm:w-44">
							<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-low-emphasis" />
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search market"
								className="h-8 rounded-md pl-8 pr-7 text-xs"
							/>
							{search && (
								<button
									type="button"
									onClick={() => setSearch("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-low-emphasis hover:text-high-emphasis"
									aria-label="Clear search"
								>
									<X className="size-3.5" />
								</button>
							)}
						</div>
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-auto">
				{loading || fetching ? (
					<TableLoading
						columns={tab === "balance" ? 4 : tab === "trades" ? 7 : tab === "open" ? 10 : 9}
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
						onCancel={handleCancel}
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={handleSort}
					/>
				)}
			</div>

			{tab !== "balance" && <Pagination page={page} total={activeData.length} onChange={setPage} />}
		</div>
	);
}

type MarketLookup = ReturnType<typeof useMarkets>["markets"][number] | undefined;

function OrderTable({
	orders,
	marketFor,
	open,
	cancelling,
	onCancel,
	sortField,
	sortDirection,
	onSort,
}: {
	orders: OrderRecord[];
	marketFor: (symbol: string) => MarketLookup;
	open: boolean;
	cancelling: string | null;
	onCancel: (orderId: string) => void;
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
										disabled={cancelling === order.id}
										onClick={() => onCancel(order.id)}
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
