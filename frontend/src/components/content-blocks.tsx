import type { ReactNode } from "react";
import type { Block } from "@/content/types";
import { cn } from "@/lib/utils";

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let key = 0;

	while ((match = LINK_PATTERN.exec(text)) !== null) {
		if (match.index > lastIndex) {
			nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
		}
		nodes.push(
			<a
				key={key++}
				href={match[2]}
				className="font-medium text-primary underline-offset-4 hover:underline"
			>
				{match[1]}
			</a>,
		);
		lastIndex = LINK_PATTERN.lastIndex;
	}

	if (lastIndex < text.length) {
		nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
	}

	return nodes;
}

export function ContentBlocks({ blocks, className }: { blocks: Block[]; className?: string }) {
	return (
		<div className={cn("space-y-2.5", className)}>
			{blocks.map((block, i) => {
				switch (block.type) {
					case "heading":
						return (
							<h3 key={i} className="pt-1 text-sm font-semibold tracking-tight text-high-emphasis">
								{block.text}
							</h3>
						);
					case "paragraph":
						return (
							<p key={i} className="text-sm leading-relaxed text-medium-emphasis">
								{renderInline(block.text)}
							</p>
						);
					case "list":
						return (
							<ul key={i} className="space-y-2">
								{block.items.map((item) => (
									<li key={item} className="flex items-start gap-2.5 text-sm text-medium-emphasis">
										<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						);
					case "link":
						return (
							<a
								key={i}
								href={block.href}
								className="text-sm font-medium text-primary underline-offset-4 hover:underline"
							>
								{block.text}
							</a>
						);
				}
			})}
		</div>
	);
}
