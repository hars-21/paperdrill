import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Page, PageContent } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { API_KEY_SCOPE_LABELS } from "@/lib/api-key-scopes";
import { cn } from "@/lib/utils";
import type { ApiKeyRecord, ApiKeyScope, CreatedApiKey } from "@/types";
import { formatDateTime } from "@/utils/format";

type ApiKeyRowProps = {
	record: ApiKeyRecord;
	verified: boolean;
	revoking: boolean;
	onRevoke: (key: ApiKeyRecord) => void;
};

function ApiKeyRow({ record, verified, revoking, onRevoke }: ApiKeyRowProps) {
	const active = record.revokedAt === null;

	return (
		<div
			className={cn(
				"grid gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(12rem,1.1fr)_minmax(16rem,1.4fr)_minmax(10rem,.8fr)_auto] lg:items-center",
				!active && "bg-l2/20 text-medium-emphasis",
			)}
		>
			<div className="min-w-0">
				<p className={cn("truncate text-sm font-semibold", active && "text-high-emphasis")}>
					{record.label}
				</p>
				<p className="mt-1 text-xs text-low-emphasis">Created {formatDateTime(record.createdAt)}</p>
			</div>

			<div>
				<p className="mb-1 text-[11px] text-low-emphasis lg:sr-only">Permissions</p>
				<p className="max-w-xl text-xs leading-5 text-medium-emphasis">
					{record.scopes.map((scope) => API_KEY_SCOPE_LABELS[scope]).join(", ")}
				</p>
			</div>

			<div>
				<p className="text-[11px] text-low-emphasis lg:sr-only">Last used</p>
				<p
					className={cn(
						"mt-1 text-xs lg:mt-0",
						active ? "text-high-emphasis" : "text-medium-emphasis",
					)}
				>
					{record.lastUsedAt ? formatDateTime(record.lastUsedAt) : "Never used"}
				</p>
			</div>

			<div className="flex items-center justify-between gap-4 lg:justify-end">
				<span
					className={cn("text-xs font-medium", active ? "text-green-text" : "text-medium-emphasis")}
				>
					{active ? "Active" : "Revoked"}
				</span>
				{active ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={!verified || revoking}
						onClick={() => onRevoke(record)}
						aria-label={`Revoke ${record.label}`}
						title={verified ? undefined : "Verify your email to revoke API keys"}
						className="px-2.5 text-medium-emphasis hover:bg-transparent hover:text-red-text"
					>
						{revoking ? "Revoking…" : "Revoke"}
					</Button>
				) : null}
			</div>
		</div>
	);
}

function KeysLoading() {
	return (
		<div className="divide-y divide-border/30">
			{Array.from({ length: 3 }).map((_, index) => (
				<div
					key={index}
					className="grid gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(12rem,1.1fr)_minmax(16rem,1.4fr)_minmax(10rem,.8fr)_auto] lg:items-center"
				>
					<div className="space-y-2">
						<Skeleton className="h-3.5 w-32" />
						<Skeleton className="h-3 w-44" />
					</div>
					<Skeleton className="h-3 w-full max-w-72" />
					<Skeleton className="h-3 w-28" />
					<Skeleton className="h-7 w-16 lg:justify-self-end" />
				</div>
			))}
		</div>
	);
}

function KeyListState({
	title,
	description,
	action,
	error = false,
}: {
	title: string;
	description: string;
	action?: React.ReactNode;
	error?: boolean;
}) {
	return (
		<div className="flex min-h-56 items-center justify-center px-6 py-10 text-center">
			<div className="max-w-md">
				<p className={cn("text-sm font-semibold", error ? "text-red-text" : "text-high-emphasis")}>
					{title}
				</p>
				<p className="mt-1.5 text-sm leading-6 text-medium-emphasis">{description}</p>
				{action ? <div className="mt-4">{action}</div> : null}
			</div>
		</div>
	);
}

export function ApiKeysPage() {
	const { verified } = useAuth();
	const [keys, setKeys] = useState<ApiKeyRecord[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [revoking, setRevoking] = useState<string | null>(null);
	const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyRecord | null>(null);

	const loadKeys = useCallback(async () => {
		setLoadError(null);
		try {
			const response = await api.getApiKeys();
			setKeys(response.keys);
		} catch (error) {
			console.error("Failed to load API keys:", error);
			setLoadError(error instanceof Error ? error.message : "Failed to load API keys.");
		}
	}, []);

	useEffect(() => {
		void loadKeys();
	}, [loadKeys]);

	const handleCreate = async (label: string, scopes: ApiKeyScope[]): Promise<CreatedApiKey> => {
		if (!verified) throw new Error("Verify your email before creating an API key.");
		const key = await api.createApiKey(label, scopes);
		await loadKeys();
		toast.success("API key created");
		return key;
	};

	const handleRevoke = async () => {
		if (!verified || !keyToRevoke) return;

		setRevoking(keyToRevoke.id);
		try {
			await api.revokeApiKey(keyToRevoke.id);
			await loadKeys();
			setKeyToRevoke(null);
			toast.success("API key revoked");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to revoke API key");
		} finally {
			setRevoking(null);
		}
	};

	const createAction = verified ? (
		<Button size="sm" onClick={() => setCreateDialogOpen(true)}>
			Create API key
		</Button>
	) : (
		<Button asChild size="sm">
			<Link to="/verify-email" state={{ returnTo: "/settings/api-keys" }}>
				Verify email to create keys
			</Link>
		</Button>
	);

	return (
		<Page>
			<PageContent className="max-w-6xl space-y-5">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-high-emphasis">API keys</h1>
						<p className="mt-1 max-w-2xl text-sm text-medium-emphasis">
							Create scoped credentials for bots and server-side trading clients.
						</p>
					</div>
					{createAction}
				</header>

				<section
					className="overflow-hidden rounded-xl border border-border/60 bg-l1 shadow-sm"
					aria-labelledby="api-credentials-title"
				>
					<div className="flex items-center justify-between gap-4 border-b border-border/40 px-4 py-4 sm:px-5">
						<div>
							<h2 id="api-credentials-title" className="text-sm font-semibold text-high-emphasis">
								Credentials
							</h2>
							<p className="mt-1 text-xs text-medium-emphasis">
								Use a separate key for each integration.
							</p>
						</div>
					</div>

					{!loadError && keys && keys.length > 0 ? (
						<div className="hidden grid-cols-[minmax(12rem,1.1fr)_minmax(16rem,1.4fr)_minmax(10rem,.8fr)_auto] gap-5 border-b border-border/40 bg-l2/35 px-5 py-2.5 text-[11px] text-low-emphasis lg:grid">
							<span>Name</span>
							<span>Permissions</span>
							<span>Last used</span>
							<span className="text-right">Status</span>
						</div>
					) : null}

					{loadError ? (
						<KeyListState
							title="Could not load API keys"
							description={loadError}
							error
							action={
								<Button variant="outline" size="sm" onClick={() => void loadKeys()}>
									Try again
								</Button>
							}
						/>
					) : keys === null ? (
						<KeysLoading />
					) : keys.length === 0 ? (
						<KeyListState
							title="No API keys"
							description="Create a key when your bot or server-side client is ready to connect."
						/>
					) : (
						<div className="divide-y divide-border/30">
							{keys.map((key) => (
								<ApiKeyRow
									key={key.id}
									record={key}
									verified={verified}
									revoking={revoking === key.id}
									onRevoke={setKeyToRevoke}
								/>
							))}
						</div>
					)}

					<div className="flex flex-col gap-1.5 border-t border-border/40 px-4 py-3.5 text-xs text-medium-emphasis sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<p>Full keys are shown once. Store them outside client-side code.</p>
						<a
							href="https://docs.paperdrill.dev/authentication"
							target="_blank"
							rel="noreferrer"
							className="font-medium text-high-emphasis underline-offset-4 hover:underline"
						>
							Authentication guide
						</a>
					</div>
				</section>

				<CreateApiKeyDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					onCreate={handleCreate}
				/>

				<ConfirmDialog
					open={keyToRevoke !== null}
					onOpenChange={(open) => !open && setKeyToRevoke(null)}
					title="Revoke this API key?"
					description={
						keyToRevoke
							? `Revoke "${keyToRevoke.label}". Applications using it will lose access immediately.`
							: "Applications using this key will lose access immediately."
					}
					confirmLabel="Revoke key"
					cancelLabel="Keep key"
					pendingLabel="Revoking…"
					pending={revoking !== null}
					onConfirm={() => void handleRevoke()}
				/>
			</PageContent>
		</Page>
	);
}
