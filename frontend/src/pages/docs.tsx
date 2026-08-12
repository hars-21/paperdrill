import { Page, PageContent, PageHeader } from "@/components/ui/page";
import { docs } from "@/content/docs";
import { ContentBlocks } from "@/components/content-blocks";

export function DocsPage() {
	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
					<p className="text-xs text-medium-emphasis mt-1">{docs.intro}</p>
				</div>
			</PageHeader>

			<PageContent className="max-w-3xl">
				<div className="space-y-6">
					{docs.sections.map((section) => (
						<section key={section.id} id={section.id} className="scroll-mt-20">
							<h2 className="text-base font-bold tracking-tight text-high-emphasis">
								{section.title}
							</h2>
							<div className="mt-2">
								<ContentBlocks blocks={section.blocks} />
							</div>
						</section>
					))}
				</div>
			</PageContent>
		</Page>
	);
}
