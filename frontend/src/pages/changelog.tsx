import { Page, PageContent, PageHeader } from "@/components/ui/page";
import { changelog } from "@/content/changelog";

const GROUPS = [
	{ key: "features", label: "Features" },
	{ key: "fixes", label: "Fixes" },
	{ key: "updates", label: "Updates" },
] as const;

export function ChangelogPage() {
	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
					<p className="text-xs text-medium-emphasis mt-1">{changelog.intro}</p>
				</div>
			</PageHeader>

			<PageContent className="max-w-3xl">
				<div className="space-y-8">
					{changelog.entries.map((entry) => (
						<article
							key={entry.version}
							className="border-b border-border/40 pb-8 last:border-0 last:pb-0"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h2 className="text-xl font-bold tracking-tight text-high-emphasis">
									v{entry.version}
								</h2>
								<span className="text-xs text-low-emphasis">{entry.date}</span>
							</div>

							<div className="mt-5 space-y-5">
								{GROUPS.filter((group) => entry[group.key].length > 0).map((group) => (
									<div key={group.key}>
										<h3 className="text-sm font-semibold text-medium-emphasis">{group.label}</h3>
										<ul className="mt-2.5 space-y-2">
											{entry[group.key].map((item) => (
												<li
													key={item}
													className="flex items-start gap-2.5 text-sm text-medium-emphasis"
												>
													<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
													<span>{item}</span>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>
						</article>
					))}
				</div>
			</PageContent>
		</Page>
	);
}
