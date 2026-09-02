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
import { sendVerificationEmail } from "../utils/emailClient";

export async function signup(req: Request, res: Response) {
	const parsedBody = signupSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { email, name, password } = parsedBody.data;

	try {
		const existingUser = await prisma.user.findUnique({ where: { email } });

		if (existingUser) {
			res.status(400).json({ error: "User already exists" });
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: { email, name, password: hashedPassword },
		});

		const token = crypto.randomBytes(32).toString("hex");

		await prisma.verificationToken.create({
			data: {
				userId: user.id,
				tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
		});

		sendVerificationEmail(user.name, user.email, token);

		res
			.status(201)
			.cookie("token", createToken({ id: user.id }), config.cookie)
			.json({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
				message: "Account created. Check your email to verify it.",
			});
	} catch (e) {
		logger.error("Signup failed", e);
		res.status(500).json({ error: "Internal server error" });
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
			res.status(400).json({ error: "Invalid email or password" });
			return;
		}

		let match = await bcrypt.compare(password, user.password);
		if (!match) {
			res.status(400).json({ error: "Invalid email or password" });
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
		res.status(500).json({ error: "Internal server error" });
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
			res.status(404).json({ error: "Invalid verification token" });
			return;
		}

		if (verification.expiresAt < new Date()) {
			res.status(400).json({ error: "Verification token has expired" });
			return;
		}

		if (verification.usedAt) {
			res.status(400).json({ error: "Verification token has already been used" });
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
		res.status(500).json({ error: "Internal server error" });
	}
}

export async function resendVerificationEmail(req: Request, res: Response) {
	const parsedBody = resendVerificationEmailSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { email } = parsedBody.data;

	try {
		const user = await prisma.user.findUnique({ where: { email } });

		if (!user) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		if (user.emailVerified) {
			res.status(400).json({ error: "Email is already verified" });
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

		sendVerificationEmail(user.name, user.email, token);

		res.status(200).json({
			success: true,
			message: "Verification email resent successfully. Please check your email.",
		});
	} catch (e) {
		logger.error("Resend verification email failed", e);
		res.status(500).json({ error: "Internal server error" });
	}
}
