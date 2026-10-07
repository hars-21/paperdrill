import { LegalDocument } from "@/components/legal/legal-document";
import { privacy } from "@/content/privacy";

export function PrivacyPage() {
	return (
		<LegalDocument
			title="Privacy Policy"
			lastUpdated={privacy.lastUpdated}
			sections={privacy.sections}
		/>
	);
}
