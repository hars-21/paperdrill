import { ContentBlocks } from "@/components/content-blocks";
import { Page, PageContent, PageHeader } from "@/components/ui/page";
import { privacy } from "@/content/privacy";

export function PrivacyPage() {
	return (
		<Page>
			<PageHeader>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
					<p className="text-xs text-medium-emphasis mt-1">Last updated: {privacy.lastUpdated}</p>
				</div>
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
