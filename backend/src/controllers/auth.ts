import bcrypt from "bcrypt";
import { prisma } from "../db";
import type { Request, Response } from "express";
import {
	signupSchema,
	signinSchema,
	verifyEmailSchema,
	resendVerificationEmailSchema,
} from "../schema/auth";
import { createToken } from "../middleware/auth";
import { sendValidationError } from "../utils/validation";
import { logger } from "../utils/logger";
import { config } from "../config";
import crypto from "crypto";
import { isEmailDeliveryEnabled, sendVerificationEmail } from "../utils/emailClient";
import { sendToEngine } from "../utils/engineClient";
import { assetPrecision } from "../store/market";
import { toBigInt } from "../utils/convert";
import { ApiError, sendApiError } from "../utils/apiError";

const INITIAL_BALANCE_ASSET = "USD";
const INITIAL_BALANCE_AMOUNT = "10000";

function initialBalance() {
	const precision = assetPrecision.get(INITIAL_BALANCE_ASSET);

	if (precision == null) {
		throw new Error(`Missing precision for ${INITIAL_BALANCE_ASSET}`);
	}

	return toBigInt(INITIAL_BALANCE_AMOUNT, precision);
}

async function initializeBalance(userId: string, amount: bigint) {
	const response = await sendToEngine("initialize_balance", {
		userId,
		asset: INITIAL_BALANCE_ASSET,
		amount: amount.toString(),
	});

	if (!response.success) {
		throw new Error(response.error ?? "Balance initialization failed");
	}
}

export async function signup(req: Request, res: Response) {
	const parsedBody = signupSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { email, name, password } = parsedBody.data;
	const emailDeliveryEnabled = isEmailDeliveryEnabled();
	const bypassEmailVerification = config.app.env !== "production" && !emailDeliveryEnabled;

	if (config.app.env === "production" && !emailDeliveryEnabled) {
		sendApiError(res, 503, "SERVICE_UNAVAILABLE", "Account registration is currently unavailable");
		return;
	}

	try {
		const existingUser = await prisma.user.findUnique({ where: { email } });

		if (existingUser) {
			sendApiError(res, 409, "CONFLICT", "An account with this email already exists");
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const balance = initialBalance();

		const user = await prisma.user.create({
			data: {
				email,
				name,
				password: hashedPassword,
				emailVerified: bypassEmailVerification,
				pnlBaseline: balance,
				pnlBaselineAt: new Date(),
			},
		});

		try {
			await initializeBalance(user.id, balance);
		} catch (error) {
			await prisma.user.delete({ where: { id: user.id } });
			throw error;
		}

		if (emailDeliveryEnabled) {
			const token = crypto.randomBytes(32).toString("hex");

			await prisma.verificationToken.create({
				data: {
					userId: user.id,
					tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				},
			});

			void sendVerificationEmail(user.name, user.email, token);
		}

		res
			.status(201)
			.cookie("token", createToken({ id: user.id }), config.cookie)
			.json({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
				message: user.emailVerified
					? "Account created successfully."
					: "Account created. Check your email to verify it.",
			});
	} catch (e) {
		logger.error("Signup failed", e);
		if (e instanceof ApiError) {
			sendApiError(res, e.status, e.code, e.message, e.details);
			return;
		}
		sendApiError(res, 500, "INTERNAL_ERROR", "Account creation failed unexpectedly");
	}
}

export async function signin(req: Request, res: Response) {
	const parsedBody = signinSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { email, password } = parsedBody.data;

	try {
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			sendApiError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
			return;
		}

		let match = await bcrypt.compare(password, user.password);
		if (!match) {
			sendApiError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
			return;
		}

		res
			.status(200)
			.cookie("token", createToken({ id: user.id }), config.cookie)
			.json({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
			});
	} catch (e) {
		logger.error("Signin failed", e);
		sendApiError(res, 500, "INTERNAL_ERROR", "Sign in failed unexpectedly");
	}
}

export async function signout(_req: Request, res: Response) {
	res
		.status(200)
		.clearCookie("token", config.cookie)
		.json({ success: true, message: "Signed out successfully" });
}

export async function verifyEmail(req: Request, res: Response) {
	const parsedQuery = verifyEmailSchema.safeParse(req.query);

	if (!parsedQuery.success) {
		sendValidationError(res, parsedQuery.error);
		return;
	}

	const { token } = parsedQuery.data;

	try {
		const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

		const verification = await prisma.verificationToken.findUnique({
			where: { tokenHash },
		});

		if (!verification) {
			sendApiError(res, 404, "INVALID_VERIFICATION_TOKEN", "Verification token was not found");
			return;
		}

		if (verification.expiresAt < new Date()) {
			sendApiError(res, 410, "VERIFICATION_TOKEN_EXPIRED", "Verification token has expired");
			return;
		}

		if (verification.usedAt) {
			sendApiError(res, 409, "VERIFICATION_TOKEN_USED", "Verification token has already been used");
			return;
		}

		await prisma.verificationToken.update({
			where: { tokenHash },
			data: { usedAt: new Date() },
		});

		await prisma.user.update({
			where: { id: verification.userId },
			data: { emailVerified: true },
		});

		res.status(200).json({ message: "Email verified successfully" });
	} catch (e) {
		logger.error("Email verification failed", e);
		sendApiError(res, 500, "INTERNAL_ERROR", "Email verification failed unexpectedly");
	}
}

export async function resendVerificationEmail(req: Request, res: Response) {
	const parsedBody = resendVerificationEmailSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { email } = parsedBody.data;
	if (!isEmailDeliveryEnabled()) {
		sendApiError(res, 503, "SERVICE_UNAVAILABLE", "Email delivery is currently unavailable");
		return;
	}

	try {
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user) {
			sendApiError(res, 404, "USER_NOT_FOUND", "User not found");
			return;
		}

		if (user.emailVerified) {
			sendApiError(res, 409, "CONFLICT", "Email is already verified");
			return;
		}

		const token = crypto.randomBytes(32).toString("hex");

		await prisma.verificationToken.create({
			data: {
				userId: user.id,
				tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
		});

		void sendVerificationEmail(user.name, user.email, token);

		res.status(200).json({
			success: true,
			message: "Verification email resent successfully. Please check your email.",
		});
	} catch (e) {
		logger.error("Resend verification email failed", e);
		sendApiError(res, 500, "INTERNAL_ERROR", "Verification email could not be sent");
	}
}
