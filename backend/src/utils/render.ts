import { readFile } from "fs/promises";
import path from "path";

function renderTemplate(template: string, variables: Record<string, string>) {
	return Object.entries(variables).reduce(
		(html, [key, value]) => html.replaceAll(`{{{${key}}}}`, value),
		template,
	);
}

export async function renderVerificationEmail(name: string, verificationUrl: string) {
	const templatePath = path.join(__dirname, "../templates/email-verification.html");
	const template = await readFile(templatePath, "utf-8");

	return renderTemplate(template, {
		name: name,
		verification_url: verificationUrl,
	});
}
