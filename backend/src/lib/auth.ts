import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "../config";
import { prisma } from "../db";
import { ensureGoogleUserVerified } from "../services/account-bootstrap";
import { sendVerificationEmail } from "../utils/emailClient";

const googleProvider =
	config.auth.googleClientId && config.auth.googleClientSecret
		? {
				google: {
					clientId: config.auth.googleClientId,
					clientSecret: config.auth.googleClientSecret,
				},
			}
		: undefined;

export const auth = betterAuth({
	appName: "PaperDrill",
	secret: config.auth.betterAuthSecret,
	baseURL: config.auth.betterAuthUrl,
	basePath: "/api/auth",
	trustedOrigins: config.cors.origin,
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, token }) => {
			const url = `${config.app.url}/verify-email?token=${encodeURIComponent(token)}`;
			await sendVerificationEmail(user.name, user.email, url);
		},
	},
	account: {
		accountLinking: { enabled: true },
	},
	socialProviders: googleProvider,
	session: {
		expiresIn: 7 * 24 * 60 * 60,
		updateAge: 24 * 60 * 60,
	},
	advanced: {
		database: { generateId: "uuid" },
		defaultCookieAttributes: {
			httpOnly: true,
			secure: config.cookie.secure,
			sameSite: config.cookie.sameSite,
			path: "/",
		},
	},
	databaseHooks: {
		account: {
			create: {
				after: async (account) => {
					if (account.providerId === "google") {
						await ensureGoogleUserVerified(account.userId);
					}
				},
			},
		},
	},
});
