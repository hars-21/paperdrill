import { Resend } from "resend";
import { config } from "../config";
import { logger } from "./logger";
import { emailVerificationTemplate } from "../templates/email-verification";

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

export function isEmailDeliveryEnabled() {
	return resend !== null && config.resend.from !== undefined;
}

export async function sendVerificationEmail(name: string, email: string, token: string) {
	if (!resend || !config.resend.from) return false;

	const verificationUrl = `${config.app.url}/verify-email?token=${token}`;
	const html = emailVerificationTemplate(name, verificationUrl);
	const { error } = await resend.emails.send({
		from: config.resend.from,
		to: [email],
		subject: "Verify your PaperDrill account",
		html,
	});

	if (error) {
		logger.error("Failed to send verification email", error);
		return false;
	}

	logger.info(`Verification email sent to ${email}`);
	return true;
}
