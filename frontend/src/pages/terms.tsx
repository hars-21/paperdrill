import { Page, PageContent, PageHeader, PageHeading } from "@/components/ui/page";
import { terms } from "@/content/terms";
import { ContentBlocks } from "@/components/content-blocks";

export function TermsPage() {
	return (
		<Page>
			<PageHeader>
				<PageHeading title="Terms of Service" description={`Last updated: ${terms.lastUpdated}`} />
			</PageHeader>

			<PageContent className="max-w-3xl">
				<div className="space-y-6">
					{terms.sections.map((section) => (
						<section key={section.title}>
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
