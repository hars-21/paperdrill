import type { ComponentPropsWithoutRef } from "react";
import { Link } from "react-router-dom";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);

function MarkdownLink({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
	const className = "font-medium text-primary underline underline-offset-4 hover:text-primary/80";

	if (href.startsWith("/")) {
		return <Link to={href} className={className}>{children}</Link>;
	}

	return <a href={href} className={className} rel="noreferrer" {...props}>{children}</a>;
}

function MarkdownCode({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
	const source = String(children).replace(/\n$/, "");
	const language = /language-([\w-]+)/.exec(className ?? "")?.[1];

	if (!language || !hljs.getLanguage(language)) {
		return (
			<code
				className={`rounded bg-l2 px-1.5 py-0.5 font-mono text-[0.85em] text-high-emphasis ${className ?? ""}`}
				{...props}
			>
				{children}
			</code>
		);
	}

	return (
		<code
			className={`hljs language-${language}`}
			data-source={source}
			dangerouslySetInnerHTML={{ __html: hljs.highlight(source, { language }).value }}
		/>
	);
}

export function MarkdownContent({ content }: { content: string }) {
	return (
		<article className="min-w-0 text-sm leading-7 text-medium-emphasis">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => (
						<h1 className="mb-4 text-3xl font-semibold tracking-tight text-high-emphasis">{children}</h1>
					),
					h2: ({ children }) => (
						<h2 className="mb-3 mt-10 text-xl font-semibold tracking-tight text-high-emphasis">{children}</h2>
					),
					h3: ({ children }) => (
						<h3 className="mb-2 mt-8 text-base font-semibold text-high-emphasis">{children}</h3>
					),
					p: ({ children }) => <p className="my-4">{children}</p>,
					a: MarkdownLink,
					ul: ({ children }) => <ul className="my-4 list-disc space-y-1 pl-5">{children}</ul>,
					ol: ({ children }) => <ol className="my-4 list-decimal space-y-1 pl-5">{children}</ol>,
					pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
					code: MarkdownCode,
					blockquote: ({ children }) => (
						<blockquote className="my-5 border-l-2 border-primary pl-4">{children}</blockquote>
					),
					table: ({ children }) => (
						<div className="my-5 overflow-x-auto rounded-lg border border-border/60">
							<table className="w-full border-collapse text-left">{children}</table>
						</div>
					),
					th: ({ children }) => (
						<th className="border-b border-border/60 bg-l2 px-4 py-2.5 font-medium text-high-emphasis">
							{children}
						</th>
					),
					td: ({ children }) => (
						<td className="border-b border-border/40 px-4 py-2.5 last:border-b-0">{children}</td>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</article>
	);
}
