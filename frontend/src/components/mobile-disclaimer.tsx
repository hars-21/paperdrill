import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";

export function MobileDisclaimer() {
	const [dismissed, setDismissed] = useState(false);

	if (dismissed) return null;

	return (
		<div className="lg:hidden flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 shrink-0">
			<div>
				For the best experience, please use a desktop or tablet. Mobile layout is basic and may not
				display all features correctly.
			</div>
			<Button variant="icon" onClick={() => setDismissed(true)} aria-label="Dismiss">
				<X className="size-3.5" />
			</Button>
		</div>
	);
}
