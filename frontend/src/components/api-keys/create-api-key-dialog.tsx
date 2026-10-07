import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_KEY_SCOPE_OPTIONS } from "@/lib/api-key-scopes";
import { cn } from "@/lib/utils";
import type { ApiKeyScope, CreatedApiKey } from "@/types";

type CreateApiKeyDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (label: string, scopes: ApiKeyScope[]) => Promise<CreatedApiKey>;
};

const DEFAULT_SCOPES = API_KEY_SCOPE_OPTIONS.map((scope) => scope.value);

export function CreateApiKeyDialog({
	open,
	onOpenChange,
	onCreate,
}: CreateApiKeyDialogProps) {
	const labelInputRef = useRef<HTMLInputElement>(null);
	const secretInputRef = useRef<HTMLInputElement>(null);
	const [label, setLabel] = useState("");
	const [scopes, setScopes] = useState<ApiKeyScope[]>(DEFAULT_SCOPES);
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (createdKey?.key) secretInputRef.current?.focus();
	}, [createdKey?.key]);

	const reset = () => {
		setLabel("");
		setScopes(DEFAULT_SCOPES);
		setCreating(false);
		setCreateError(null);
		setCreatedKey(null);
		setCopied(false);
	};

	const close = () => {
		reset();
		onOpenChange(false);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && (creating || createdKey)) return;
		if (!nextOpen) reset();
		onOpenChange(nextOpen);
	};

	const toggleScope = (scope: ApiKeyScope, checked: boolean) => {
		setScopes((current) =>
			checked ? [...current, scope] : current.filter((item) => item !== scope),
		);
		setCreateError(null);
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!label.trim() || scopes.length === 0 || creating) return;

		setCreating(true);
		setCreateError(null);
		try {
			const key = await onCreate(label.trim(), scopes);
			setCreatedKey(key);
			setCopied(false);
		} catch (error) {
			setCreateError(error instanceof Error ? error.message : "Failed to create API key.");
		} finally {
			setCreating(false);
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
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<Dialog.Content
					className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border/60 bg-background shadow-[0_28px_90px_-34px_color-mix(in_srgb,var(--foreground)_38%,transparent)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
					onEscapeKeyDown={(event) => (creating || createdKey) && event.preventDefault()}
					onPointerDownOutside={(event) => (creating || createdKey) && event.preventDefault()}
					onOpenAutoFocus={(event) => {
						if (createdKey) return;
						event.preventDefault();
						labelInputRef.current?.focus();
					}}
				>
					{createdKey ? (
						<div>
							<div className="border-b border-border/40 px-5 py-5 sm:px-6 sm:py-6">
								<p className="text-xs font-medium text-green-text">Created successfully</p>
								<Dialog.Title className="mt-2 text-xl font-semibold tracking-tight text-high-emphasis">
									API key created
								</Dialog.Title>
								<Dialog.Description className="mt-1.5 max-w-lg text-sm leading-6 text-medium-emphasis">
									Copy the key now. PaperDrill will not show the full value again.
								</Dialog.Description>
							</div>

							<div className="px-5 py-5 sm:px-6 sm:py-6">
								<div>
									<p className="text-xs font-medium text-medium-emphasis">Key name</p>
									<p className="mt-1 text-sm font-semibold text-high-emphasis">{createdKey.label}</p>
								</div>

								<div className="mt-5 border-y border-border/50 py-4">
									<Label htmlFor="created-api-key">Secret key</Label>
									<div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
										<Input
											id="created-api-key"
											readOnly
											name="created-api-key"
											value={createdKey.key}
											className="h-10 bg-l2/40 font-mono text-xs"
											onFocus={(event) => event.currentTarget.select()}
											ref={secretInputRef}
										/>
										<Button type="button" variant="outline" className="h-10" onClick={copyKey}>
											{copied ? <Check /> : <Copy />}
											{copied ? "Copied" : "Copy key"}
										</Button>
									</div>
								</div>

								<p className="mt-4 text-xs leading-5 text-medium-emphasis">
									Store this key in a secret manager or environment variable. Never include it in
									client-side code or commit it to source control.
								</p>
							</div>

							<div className="flex justify-end border-t border-border/40 px-5 py-4 sm:px-6">
								<Button type="button" onClick={close}>
									I saved this key
								</Button>
							</div>
						</div>
					) : (
						<form onSubmit={handleSubmit}>
							<div className="flex items-start justify-between gap-4 border-b border-border/40 px-5 py-5 sm:px-6 sm:py-6">
								<div>
									<Dialog.Title className="text-xl font-semibold tracking-tight text-high-emphasis">
										Create API key
									</Dialog.Title>
									<Dialog.Description className="mt-1.5 text-sm leading-6 text-medium-emphasis">
										Name the key and choose only the access your client needs.
									</Dialog.Description>
								</div>
								<Dialog.Close asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										disabled={creating}
										aria-label="Close create API key dialog"
									>
										<X />
									</Button>
								</Dialog.Close>
							</div>

							<div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
								<div className="space-y-2">
									<Label htmlFor="key-label">Key name</Label>
									<Input
										ref={labelInputRef}
										id="key-label"
										name="key-label"
										value={label}
										onChange={(event) => {
											setLabel(event.target.value);
											setCreateError(null);
										}}
										maxLength={50}
										placeholder="Market maker"
										autoComplete="off"
										className="h-10"
									/>
									<p className="text-xs text-medium-emphasis">
										Use a name that identifies the bot or environment using this key.
									</p>
								</div>

								<fieldset>
									<legend className="text-sm font-medium text-high-emphasis">Permissions</legend>
									<p className="mt-1 text-xs text-medium-emphasis">
										You can revoke this key at any time, but its permissions cannot be edited.
									</p>
									<div className="mt-3 divide-y divide-border/40 border-y border-border/50">
										{API_KEY_SCOPE_OPTIONS.map((scope) => {
											const checked = scopes.includes(scope.value);
											return (
												<label
													key={scope.value}
													className="flex cursor-pointer items-start justify-between gap-5 py-3.5 outline-none"
												>
													<span>
														<span
															className={cn(
																"block text-sm font-medium",
																checked ? "text-high-emphasis" : "text-medium-emphasis",
															)}
														>
															{scope.label}
														</span>
														<span className="mt-1 block text-xs leading-5 text-medium-emphasis">
															{scope.description}
														</span>
													</span>
													<Checkbox
														checked={checked}
														onCheckedChange={(value) => toggleScope(scope.value, value === true)}
														className="mt-0.5 bg-l1"
													/>
												</label>
											);
										})}
									</div>
								</fieldset>

								{createError ? (
									<p role="alert" className="text-sm text-red-text">
										{createError}
									</p>
								) : scopes.length === 0 ? (
									<p role="alert" className="text-sm text-red-text">
										Choose at least one permission.
									</p>
								) : null}
							</div>

							<div className="flex flex-col-reverse gap-2 border-t border-border/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
								<Dialog.Close asChild>
									<Button type="button" variant="ghost" disabled={creating}>
										Cancel
									</Button>
								</Dialog.Close>
								<Button
									type="submit"
									disabled={creating || !label.trim() || scopes.length === 0}
								>
									{creating ? "Creating…" : "Create API key"}
								</Button>
							</div>
						</form>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
