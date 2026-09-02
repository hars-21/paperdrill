import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

function getText(node: ReactNode): string {
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(getText).join("");
	if (node && typeof node === "object" && "props" in node) {
		const props = (node as { props: { children?: ReactNode; "data-source"?: string } }).props;
		return props["data-source"] ?? getText(props.children);
	}
	return "";
}

export function CodeBlock({ children }: { children?: ReactNode }) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(getText(children).replace(/\n$/, ""));
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className="group relative my-5 overflow-hidden rounded-lg border border-border/60 bg-l2">
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={copy}
				aria-label="Copy code"
				className="absolute right-2 top-2 bg-l1 text-medium-emphasis"
			>
				{copied ? <Check /> : <Copy />}
			</Button>
			<pre className="overflow-x-auto p-4 pr-12 text-sm leading-6 text-high-emphasis [&_code]:bg-transparent [&_code]:p-0">
				{children}
			</pre>
		</div>
	);
}
