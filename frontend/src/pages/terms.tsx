import { LegalDocument } from "@/components/legal/legal-document";
import { terms } from "@/content/terms";

export function TermsPage() {
	return (
		<LegalDocument
			title="Terms of Service"
			lastUpdated={terms.lastUpdated}
			sections={terms.sections}
		/>
	);
}
