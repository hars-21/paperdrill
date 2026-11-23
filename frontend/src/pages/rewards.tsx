import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Page, PageContent, PageHeader, PageHeading } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface, SurfaceContent, SurfaceHeader } from "@/components/ui/surface";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { accountQueryKeys, invalidateAccountQueries } from "@/lib/query-client";
import type { RewardsSummary } from "@/types";
import { formatDateTime } from "@/utils/format";
import { toast } from "sonner";

export function RewardsPage() {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const rewardsQueryKey = accountQueryKeys.rewards(user?.id ?? "");

	const rewardsQuery = useQuery({
		queryKey: rewardsQueryKey,
		queryFn: api.getRewards,
		enabled: Boolean(user?.id),
	});

	const claimMutation = useMutation({
		mutationFn: api.claimDailyCredit,
		onSuccess: async (credit) => {
			toast.success(
				credit.credited
					? `Daily credit claimed: +${credit.amount} ${credit.asset}`
					: "Today's credit was already claimed.",
			);

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: rewardsQueryKey }),
				user ? invalidateAccountQueries(queryClient, user.id) : Promise.resolve(),
			]);
		},
		onError: (error) => {
			toast.error(error instanceof ApiError ? error.message : "Could not claim daily credit.");
		},
	});

	const rewards = rewardsQuery.data;
	const dailyClaimError =
		claimMutation.error instanceof ApiError
			? claimMutation.error.message
			: claimMutation.isError
				? "Could not claim daily credit."
				: null;

	const claimLabel = !rewards
		? "Claim daily credit"
		: rewards.daily.claimedToday
			? "Claimed today"
			: rewards.daily.pending
				? "Claim in progress"
				: rewards.daily.eligible
					? `Claim ${rewards.daily.amount} ${rewards.daily.asset}`
					: "Not eligible yet";

	return (
		<Page>
			<PageHeader>
				<PageHeading
					title="Rewards"
					description="Starter and daily paper credits for practice trading. Credits are excluded from leaderboard returns."
				/>
			</PageHeader>

			<PageContent className="max-w-6xl">
				{rewardsQuery.isLoading ? (
					<RewardsSkeleton />
				) : rewardsQuery.isError || !rewards ? (
					<Surface className="rounded-xl">
						<FeedbackState
							title="Rewards unavailable"
							description={
								rewardsQuery.error instanceof ApiError
									? rewardsQuery.error.message
									: "We could not load your rewards right now."
							}
							action={
								<Button
									variant="outline"
									onClick={() => void rewardsQuery.refetch()}
									disabled={rewardsQuery.isFetching}
								>
									{rewardsQuery.isFetching ? "Retrying…" : "Try again"}
								</Button>
							}
						/>
					</Surface>
				) : (
					<>
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
							<Surface className="rounded-xl">
								<SurfaceHeader className="flex items-start justify-between gap-4">
									<div>
										<h2 className="text-base font-semibold text-high-emphasis">Daily credit</h2>
										<p className="mt-1 text-sm text-medium-emphasis">
											Resets every day at 00:00 UTC.
										</p>
									</div>
									<span className="text-xs text-low-emphasis whitespace-nowrap">
										{rewards.daily.creditDate}
									</span>
								</SurfaceHeader>
								<SurfaceContent>
									<p className="text-4xl font-semibold tracking-tight text-high-emphasis tabular-nums">
										{rewards.daily.amount}
										<span className="ml-2 text-lg font-medium text-medium-emphasis">
											{rewards.daily.asset}
										</span>
									</p>
									<p className="mt-3 max-w-xl text-sm leading-6 text-medium-emphasis">
										{dailyStatus(rewards)}
									</p>
									{dailyClaimError ? (
										<p className="mt-3 text-sm text-red-text" role="alert">
											{dailyClaimError}
										</p>
									) : null}
									<Button
										className="mt-6"
										size="lg"
										disabled={
											!rewards.daily.eligible ||
											rewards.daily.pending ||
											claimMutation.isPending
										}
										onClick={() => claimMutation.mutate()}
									>
										{claimMutation.isPending ? "Claiming…" : claimLabel}
									</Button>
								</SurfaceContent>
							</Surface>

							<Surface className="rounded-xl">
								<SurfaceHeader>
									<h2 className="text-base font-semibold text-high-emphasis">Initial credit</h2>
									<p className="mt-1 text-sm text-medium-emphasis">Added once during setup.</p>
								</SurfaceHeader>
								<SurfaceContent>
									<p className="text-3xl font-semibold tracking-tight text-high-emphasis tabular-nums">
										{rewards.initial.amount}
										<span className="ml-2 text-base font-medium text-medium-emphasis">
											{rewards.initial.asset}
										</span>
									</p>
									<p className="mt-3 text-sm leading-6 text-medium-emphasis">
										{rewards.initial.claimed && rewards.initial.claimedAt
											? `Added ${formatDateTime(rewards.initial.claimedAt)}.`
											: rewards.initial.available
												? "Available when you finish setup."
												: "Not available for this account."}
									</p>
								</SurfaceContent>
							</Surface>
						</div>

						<Surface className="rounded-xl">
							<SurfaceHeader>
								<h2 className="text-base font-semibold text-high-emphasis">Credit history</h2>
								<p className="mt-1 text-sm text-medium-emphasis">
									Your recent paper-credit deposits.
								</p>
							</SurfaceHeader>
							{rewards.history.length === 0 ? (
								<FeedbackState
									className="min-h-32"
									title="No credits yet"
									description="Your starter and daily credits will appear here."
								/>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Credit</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead className="text-right">Added</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{rewards.history.map((item) => (
											<TableRow key={item.id}>
												<TableCell className="font-medium text-high-emphasis">
													{item.kind === "INITIAL" ? "Initial credit" : "Daily credit"}
												</TableCell>
												<TableCell className="tabular-nums">
													+{item.amount} {item.asset}
												</TableCell>
												<TableCell className="text-right text-medium-emphasis">
													{formatDateTime(item.createdAt)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</Surface>
					</>
				)}
			</PageContent>
		</Page>
	);
}

function dailyStatus(rewards: RewardsSummary) {
	if (rewards.daily.claimedToday) {
		return `Claimed today. Next credit available ${formatDateTime(rewards.daily.nextEligibleAt)}.`;
	}
	if (rewards.daily.pending) {
		return "A claim is already being applied. Refresh in a moment.";
	}
	if (rewards.daily.eligible) {
		return "Available now. Claim it any time before the next UTC day.";
	}
	return "Available after your email is verified and your starter balance has been added.";
}

function RewardsSkeleton() {
	return (
		<div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
			<Skeleton className="h-64 rounded-xl" />
			<Skeleton className="h-64 rounded-xl" />
			<Skeleton className="h-48 rounded-xl lg:col-span-2" />
		</div>
	);
}
