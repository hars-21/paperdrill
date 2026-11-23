import { Resend } from "resend";
import { config } from "../config";
import { logger } from "./logger";
import { emailVerificationTemplate } from "../templates/email-verification";
import { passwordResetTemplate } from "../templates/password-reset";

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

export function isEmailDeliveryEnabled() {
	return resend !== null && config.resend.from !== undefined;
}

export async function sendVerificationEmail(name: string, email: string, verificationUrl: string) {
	if (!resend || !config.resend.from) return false;

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

export async function sendPasswordResetEmail(name: string, email: string, resetUrl: string) {
	if (!resend || !config.resend.from) return false;

	const html = passwordResetTemplate(name, resetUrl);
	const { error } = await resend.emails.send({
		from: config.resend.from,
		to: [email],
		subject: "Reset your PaperDrill password",
		html,
	});

	if (error) {
		logger.error("Failed to send password reset email", error);
		return false;
	}

	logger.info(`Password reset email sent to ${email}`);
	return true;
}
