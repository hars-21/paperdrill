import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "../config";
import { prisma } from "../db";
import { bootstrapOAuthUser, verifyGoogleLinkedUser } from "../services/account-bootstrap";

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
	emailAndPassword: { enabled: false },
	account: {
		accountLinking: { enabled: true },
	},
	socialProviders: googleProvider,
	session: {
		expiresIn: 7 * 24 * 60 * 60,
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
		user: {
			create: {
				after: async (user) => {
					await bootstrapOAuthUser(user.id);
				},
			},
		},
		account: {
			create: {
				after: async (account) => {
					if (account.providerId === "google") {
						await verifyGoogleLinkedUser(account.userId);
					}
				},
			},
		},
	},
});
