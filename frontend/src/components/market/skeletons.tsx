import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export const OpenOrderSkeleton = () => {
	return (
		<div className="flex flex-col h-full select-none animate-pulse">
			<div className="flex items-center justify-between border-b border-border/40 px-5 py-3 bg-muted/15">
				<Skeleton className="h-4 w-28" />
			</div>
			<div className="overflow-auto flex-1 min-h-0">
				<Table>
					<TableHeader>
						<TableRow>
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
						{Array.from({ length: 3 }).map((_, i) => (
							<TableRow key={i}>
								<TableCell>
									<Skeleton className="h-3.5 w-12" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-3.5 w-8" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-3.5 w-10" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-3.5 w-16 ml-auto" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-3.5 w-12 ml-auto" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-3.5 w-12 ml-auto" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-3.5 w-14 ml-auto" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};

export const OrderbookSkeleton = () => {
	const DISPLAY_ROWS = 8;

	return (
		<div className="flex h-full flex-col select-none">
			<div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-muted/15">
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-2 w-2 rounded-full" />
				</div>
				<Skeleton className="h-4 w-4 rounded-full" />
			</div>

			<div className="flex border-b border-border/30 px-4 py-2 bg-muted/5 gap-4">
				<Skeleton className="h-3 flex-1" />
				<Skeleton className="h-3 flex-1" />
				<Skeleton className="h-3 flex-1" />
			</div>

			<div className="flex-1 flex flex-col justify-between min-h-0 py-2">
				<div className="flex flex-col justify-end flex-1 min-h-0 gap-2.5 px-4 py-2">
					{Array.from({ length: DISPLAY_ROWS }).map((_, i) => (
						<div key={`ask-loading-${i}`} className="flex gap-4">
							<Skeleton className="h-3 flex-1" />
							<Skeleton className="h-3 flex-1" />
							<Skeleton className="h-3 flex-1" />
						</div>
					))}
				</div>
				<div className="border-y border-border/40 bg-muted/10 px-4 py-2.5">
					<Skeleton className="h-4 w-2/3" />
				</div>
				<div className="flex flex-col justify-start flex-1 min-h-0 gap-2.5 px-4 py-2">
					{Array.from({ length: DISPLAY_ROWS }).map((_, i) => (
						<div key={`bid-loading-${i}`} className="flex gap-4">
							<Skeleton className="h-3 flex-1" />
							<Skeleton className="h-3 flex-1" />
							<Skeleton className="h-3 flex-1" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export const TradeFormSkeleton = () => {
	return (
		<div className="flex h-full flex-col select-none p-5 space-y-6 animate-pulse">
			<Skeleton className="h-9 w-full" />
			<div className="space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-3 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-3.5 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>
			</div>
			<Skeleton className="h-10 w-full mt-auto" />
		</div>
	);
};
