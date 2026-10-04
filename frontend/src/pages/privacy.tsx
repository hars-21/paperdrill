import { ContentBlocks } from "@/components/content-blocks";
import { Page, PageContent, PageHeader, PageHeading } from "@/components/ui/page";
import { privacy } from "@/content/privacy";

export function PrivacyPage() {
	return (
		<Page>
			<PageHeader>
				<PageHeading title="Privacy Policy" description={`Last updated: ${privacy.lastUpdated}`} />
			</PageHeader>

			<PageContent className="max-w-3xl">
				<div className="space-y-6">
					{privacy.sections.map((section) => (
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
