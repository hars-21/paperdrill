import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export const OpenOrderSkeleton = () => {
	return (
		<div className="flex flex-col h-full select-none animate-pulse overflow-hidden rounded-lg">
			<div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1 p-3">
				<div className="flex gap-1">
					<Skeleton className="h-8 w-24 rounded-lg" />
					<Skeleton className="h-8 w-24 rounded-lg" />
				</div>
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
	const DISPLAY_ROWS = 14;

	return (
		<div className="flex h-full flex-col select-none">
			<div className="flex items-center justify-between px-3 py-2">
				<div className="flex items-center gap-1">
					<Skeleton className="h-6 w-6 rounded" />
					<Skeleton className="h-6 w-6 rounded" />
					<Skeleton className="h-6 w-6 rounded" />
				</div>
				<div className="flex items-center gap-1">
					<Skeleton className="h-6 w-6 rounded" />
					<Skeleton className="h-6 w-6 rounded" />
				</div>
			</div>

			<div className="flex flex-row min-w-0 gap-1 px-3 py-2">
				<div className="flex justify-between flex-row w-2/3 min-w-0 gap-1">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-12" />
				</div>
				<Skeleton className="h-3 w-12" />
			</div>

			<div className="flex-1 flex flex-col justify-between min-h-0">
				<div className="flex flex-col justify-end flex-1 min-h-0 px-3">
					{Array.from({ length: DISPLAY_ROWS }).map((_, i) => (
						<div key={`ask-loading-${i}`} className="flex h-6 items-center gap-3">
							<Skeleton className="h-3 w-[30%]" />
							<Skeleton className="h-3 w-[35%] ml-auto" />
							<Skeleton className="h-3 w-[35%] ml-auto" />
						</div>
					))}
				</div>
				<div className="px-3 py-1 border-y border-border/20">
					<Skeleton className="h-4 w-20" />
				</div>
				<div className="flex flex-col justify-start flex-1 min-h-0 px-3">
					{Array.from({ length: DISPLAY_ROWS }).map((_, i) => (
						<div key={`bid-loading-${i}`} className="flex h-6 items-center gap-3">
							<Skeleton className="h-3 w-[30%]" />
							<Skeleton className="h-3 w-[35%] ml-auto" />
							<Skeleton className="h-3 w-[35%] ml-auto" />
						</div>
					))}
				</div>
			</div>

			<div className="mx-3 my-1">
				<Skeleton className="h-5 w-full rounded-sm" />
			</div>
		</div>
	);
};

export const TradeFormSkeleton = () => {
	return (
		<div className="flex h-full flex-col select-none p-3 animate-pulse">
			<div className="flex flex-col gap-3">
				<Skeleton className="h-10 w-full rounded-xl" />
				<div className="flex gap-1">
					<Skeleton className="h-8 w-16 rounded-lg" />
					<Skeleton className="h-8 w-16 rounded-lg" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-12" />
				</div>
				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-3 w-10" />
					<Skeleton className="h-11 w-full rounded-lg" />
				</div>
				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-3 w-14" />
					<Skeleton className="h-11 w-full rounded-lg" />
				</div>
				<Skeleton className="h-10 w-full rounded-xl" />
			</div>
		</div>
	);
};
