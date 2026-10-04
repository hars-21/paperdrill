import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel?: string;
	onConfirm: () => void;
	pending?: boolean;
	pendingLabel?: string;
	tone?: "default" | "destructive";
};

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Go back",
	onConfirm,
	pending = false,
	pendingLabel = "Working…",
	tone = "destructive",
}: ConfirmDialogProps) {
	return (
		<Dialog.Root open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<Dialog.Content
					className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-background p-5 shadow-xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
					onEscapeKeyDown={(event) => pending && event.preventDefault()}
					onPointerDownOutside={(event) => pending && event.preventDefault()}
				>
					<Dialog.Title className="text-base font-semibold text-high-emphasis">
						{title}
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm leading-6 text-medium-emphasis">
						{description}
					</Dialog.Description>
					<div className="mt-5 flex justify-end gap-2">
						<Dialog.Close asChild>
							<Button type="button" variant="ghost" disabled={pending}>
								{cancelLabel}
							</Button>
						</Dialog.Close>
						<Button
							type="button"
							variant={tone === "destructive" ? "destructive" : "default"}
							disabled={pending}
							onClick={onConfirm}
							className={cn(tone === "destructive" && "focus-visible:border-red-text")}
						>
							{pending ? pendingLabel : confirmLabel}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
