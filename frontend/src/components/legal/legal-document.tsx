import type { Block } from "@/content/types";
import { ContentBlocks } from "@/components/content-blocks";

type LegalSection = {
	title: string;
	blocks: Block[];
};

function sectionId(title: string) {
	return title
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function formatLegalDate(date: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${date}T00:00:00Z`));
}

function SectionLinks({ sections }: { sections: LegalSection[] }) {
	return (
		<nav aria-label="Document sections" className="space-y-1">
			{sections.map((section) => (
				<a
					key={section.title}
					href={`#${sectionId(section.title)}`}
					className="block rounded-md px-2 py-1.5 text-sm leading-5 text-medium-emphasis outline-none transition-colors hover:bg-l2 hover:text-high-emphasis focus-visible:bg-l2 focus-visible:text-high-emphasis"
				>
					{section.title}
				</a>
			))}
		</nav>
	);
}

export function LegalDocument({
	title,
	lastUpdated,
	sections,
}: {
	title: string;
	lastUpdated: string;
	sections: LegalSection[];
}) {
	return (
		<div className="w-full flex-1 bg-background">
			<header className="border-b border-border/50">
				<div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
					<h1 className="text-3xl font-semibold tracking-tight text-high-emphasis sm:text-4xl">
						{title}
					</h1>
					<p className="mt-3 text-sm text-medium-emphasis">
						Last updated {formatLegalDate(lastUpdated)}
					</p>
				</div>
			</header>

			<div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[15rem_minmax(0,44rem)] lg:gap-14 lg:px-8 lg:py-12">
				<details className="rounded-xl border border-border/60 bg-l1 px-4 py-3 lg:hidden">
					<summary className="cursor-pointer text-sm font-semibold text-high-emphasis outline-none focus-visible:text-primary">
						On this page
					</summary>
					<div className="mt-3 border-t border-border/50 pt-3">
						<SectionLinks sections={sections} />
					</div>
				</details>

				<aside className="hidden lg:block">
					<div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-3">
						<p className="mb-3 px-2 text-sm font-semibold text-high-emphasis">On this page</p>
						<SectionLinks sections={sections} />
					</div>
				</aside>

				<article className="min-w-0" aria-label={title}>
					{sections.map((section) => (
						<section
							key={section.title}
							id={sectionId(section.title)}
							className="scroll-mt-24 border-t border-border/50 py-8 first:border-t-0 first:pt-0"
						>
							<h2 className="text-xl font-semibold tracking-tight text-high-emphasis">
								{section.title}
							</h2>
							<ContentBlocks blocks={section.blocks} className="mt-3" />
						</section>
					))}
				</article>
			</div>
		</div>
	);
}
