import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardPage } from "@/components/dashboard-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { ApiKeyRecord, ApiKeyScope, CreatedApiKey } from "@/types";
import { formatDateTime } from "@/utils/format";

const scopeOptions: { value: ApiKeyScope; label: string; description: string }[] = [
	{ value: "ACCOUNT_READ", label: "Read balances", description: "View account balances." },
	{ value: "ORDER_READ", label: "Read orders", description: "View orders and trade history." },
	{ value: "ORDER_CREATE", label: "Create orders", description: "Place market and limit orders." },
	{ value: "ORDER_CANCEL", label: "Cancel orders", description: "Cancel existing open orders." },
];

const scopeLabels: Record<ApiKeyScope, string> = {
	ACCOUNT_READ: "Balances",
	ORDER_READ: "Read orders",
	ORDER_CREATE: "Create orders",
	ORDER_CANCEL: "Cancel orders",
};

export function DashboardApiKeysPage() {
	const [keys, setKeys] = useState<ApiKeyRecord[] | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [label, setLabel] = useState("");
	const [scopes, setScopes] = useState<ApiKeyScope[]>(scopeOptions.map((scope) => scope.value));
	const [creating, setCreating] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);
	const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
	const [copied, setCopied] = useState(false);

	const loadKeys = async () => {
		try {
			const response = await api.getApiKeys();
			setKeys(response.keys);
		} catch (error) {
			console.error("Failed to load API keys:", error);
			setKeys([]);
			toast.error("Failed to load API keys");
		}
	};

	useEffect(() => {
		loadKeys();
	}, []);

	const toggleScope = (scope: ApiKeyScope, checked: boolean) => {
		setScopes((current) =>
			checked ? [...current, scope] : current.filter((item) => item !== scope),
		);
	};

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!label.trim() || scopes.length === 0) return;

		setCreating(true);
		try {
			const key = await api.createApiKey(label.trim(), scopes);
			setCreatedKey(key);
			setLabel("");
			setShowForm(false);
			setCopied(false);
			await loadKeys();
			toast.success("API key created");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to create API key");
		} finally {
			setCreating(false);
		}
	};

	const handleDelete = async (key: ApiKeyRecord) => {
		const confirmed = window.confirm(
			`Delete the API key “${key.label}”? Applications using it will lose access immediately.`,
		);
		if (!confirmed) return;

		setDeleting(key.id);
		try {
			await api.revokeApiKey(key.id);
			await loadKeys();
			toast.success("API key deleted");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to delete API key");
		} finally {
			setDeleting(null);
		}
	};

	const copyKey = async () => {
		if (!createdKey) return;
		try {
			await navigator.clipboard.writeText(createdKey.key);
			setCopied(true);
			toast.success("API key copied");
		} catch {
			toast.error("Could not copy the API key");
		}
	};

	return (
		<DashboardPage
			title="API keys"
			description="Create scoped credentials for bots and other programmatic clients."
			action={
				<Button size="sm" onClick={() => setShowForm((current) => !current)}>
					{showForm ? <X /> : <Plus />}
					{showForm ? "Cancel" : "Create API key"}
				</Button>
			}
		>
			{createdKey && (
				<Card className="mb-6 gap-0 border-primary/40 bg-primary/4 py-0 shadow-none">
					<CardHeader className="grid-cols-[minmax(0,1fr)_auto] border-b border-primary/20 px-4 py-4 sm:px-5">
						<div>
							<CardTitle className="text-base">Copy your new API key</CardTitle>
							<p className="mt-1 text-sm text-medium-emphasis">
								This key is shown only once. Store it somewhere secure.
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => setCreatedKey(null)}
							aria-label="Dismiss"
						>
							<X />
						</Button>
					</CardHeader>
					<CardContent className="flex min-w-0 flex-col gap-2 p-4 sm:flex-row sm:p-5">
						<Input
							readOnly
							value={createdKey.key}
							className="font-mono text-xs"
							onFocus={(event) => event.currentTarget.select()}
						/>
						<Button variant="secondary" onClick={copyKey}>
							{copied ? <Check /> : <Copy />}
							{copied ? "Copied" : "Copy"}
						</Button>
					</CardContent>
				</Card>
			)}

			{showForm && (
				<Card className="mb-6 gap-0 border-border/60 py-0 shadow-none">
					<CardHeader className="border-b border-border/40 px-5 py-4">
						<CardTitle className="text-base">Create API key</CardTitle>
					</CardHeader>
					<CardContent className="p-5">
						<form onSubmit={handleCreate} className="space-y-5">
							<div className="max-w-md space-y-2">
								<Label htmlFor="key-label">Name</Label>
								<Input
									id="key-label"
									value={label}
									onChange={(event) => setLabel(event.target.value)}
									maxLength={50}
									placeholder="Trading bot"
									autoFocus
								/>
							</div>
							<div>
								<p className="text-sm font-medium">Permissions</p>
								<div className="mt-3 grid gap-3 sm:grid-cols-2">
									{scopeOptions.map((scope) => (
										<label
											key={scope.value}
											className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-l2"
										>
											<Checkbox
												checked={scopes.includes(scope.value)}
												onCheckedChange={(checked) => toggleScope(scope.value, checked === true)}
												className="mt-0.5 border-border bg-l1"
											/>
											<span>
												<span className="block text-sm font-medium">{scope.label}</span>
												<span className="mt-0.5 block text-xs text-medium-emphasis">
													{scope.description}
												</span>
											</span>
										</label>
									))}
								</div>
							</div>
							<Button type="submit" disabled={creating || !label.trim() || scopes.length === 0}>
								{creating ? "Creating…" : "Create key"}
							</Button>
						</form>
					</CardContent>
				</Card>
			)}

			<div className="overflow-hidden rounded-xl border border-border/60 bg-l1">
				{keys == null ? (
					<div className="space-y-4 p-5">
						{Array.from({ length: 3 }).map((_, index) => (
							<Skeleton key={index} className="h-10" />
						))}
					</div>
				) : keys.length === 0 ? (
					<div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
						<KeyRound className="size-6 text-low-emphasis" />
						<p className="mt-3 text-sm font-medium">No API keys</p>
						<p className="mt-1 text-sm text-medium-emphasis">
							Create a key when you are ready to connect a bot.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table className="min-w-200">
							<TableHeader>
								<TableRow className="bg-l2/60 hover:bg-l2/60">
									<TableHead className="px-5">Name</TableHead>
									<TableHead>Permissions</TableHead>
									<TableHead>Last used</TableHead>
									<TableHead>Created</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-16 px-5">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{keys.map((key) => (
									<TableRow
										key={key.id}
										className={key.revokedAt ? "text-medium-emphasis" : undefined}
									>
										<TableCell className="px-5 py-4 font-medium text-high-emphasis">
											{key.label}
										</TableCell>
										<TableCell className="max-w-80 text-xs">
											{key.scopes.map((scope) => scopeLabels[scope]).join(", ")}
										</TableCell>
										<TableCell className="whitespace-nowrap text-xs">
											{key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Never"}
										</TableCell>
										<TableCell className="whitespace-nowrap text-xs">
											{formatDateTime(key.createdAt)}
										</TableCell>
										<TableCell>
											<span className={key.revokedAt ? "text-medium-emphasis" : "text-green-text"}>
												{key.revokedAt ? "Revoked" : "Active"}
											</span>
										</TableCell>
										<TableCell className="px-5 text-right">
											{!key.revokedAt && (
												<Button
													variant="ghost"
													size="icon-sm"
													disabled={deleting === key.id}
													onClick={() => handleDelete(key)}
													aria-label={`Delete ${key.label}`}
													className="hover:text-red-text"
												>
													<Trash2 />
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</DashboardPage>
	);
}
