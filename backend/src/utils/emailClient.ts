import { Resend } from "resend";
import { config } from "../config";
import { logger } from "./logger";
import { renderVerificationEmail } from "./render";

const resend = new Resend(config.resend.apiKey);

export async function sendVerificationEmail(name: string, email: string, token: string) {
	const verificationUrl = `https://paperdrill.dev/verify-email?token=${token}`;
	const html = await renderVerificationEmail(name, verificationUrl);
	const { error } = await resend.emails.send({
		from: config.resend.from,
		to: [email],
		subject: "Verify your PaperDrill account",
		html,
	});

	if (error) {
		logger.error("Failed to send verification email", error);
	} else {
		logger.info(`Verification email sent to ${email}`);
	}
}
