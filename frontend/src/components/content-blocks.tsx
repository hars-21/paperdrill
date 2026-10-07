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
		<div className={cn("space-y-3", className)}>
			{blocks.map((block, i) => {
				switch (block.type) {
					case "heading":
						return (
							<h3 key={i} className="pt-2 text-base font-semibold tracking-tight text-high-emphasis">
								{block.text}
							</h3>
						);
					case "paragraph":
						return (
							<p key={i} className="text-[15px] leading-7 text-medium-emphasis">
								{renderInline(block.text)}
							</p>
						);
					case "list":
						return (
							<ul key={i} className="list-disc space-y-2.5 pl-5 marker:text-low-emphasis">
								{block.items.map((item) => (
									<li key={item} className="pl-1 text-[15px] leading-7 text-medium-emphasis">
										{item}
									</li>
								))}
							</ul>
						);
					case "link":
						return (
							<a
								key={i}
								href={block.href}
								className="text-[15px] font-medium text-primary underline-offset-4 hover:underline"
							>
								{block.text}
							</a>
						);
				}
			})}
		</div>
	);
}
