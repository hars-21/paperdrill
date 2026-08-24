import bcrypt from "bcrypt";
import { prisma } from "../db";
import type { Request, Response } from "express";
import { signupSchema, signinSchema } from "../schema/auth";
import { createToken } from "../middleware/auth";
import { sendValidationError } from "../utils/validation";
import { logger } from "../utils/logger";
import { config } from "../config";

export async function signup(req: Request, res: Response) {
	const parsedBody = signupSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, parsedBody.error);
		return;
	}

	const { email, name, password } = parsedBody.data;
	const hashedPassword = await bcrypt.hash(password, 10);

	try {
		const existingUser = await prisma.user.findUnique({ where: { email } });

		if (existingUser) {
			res.status(400).json({ error: "User already exists" });
			return;
		}

		const user = await prisma.user.create({
			data: { email, name, password: hashedPassword },
		});

		res
			.status(201)
			.cookie("token", createToken({ id: user.id }), config.cookie)
			.json({
				userId: user.id,
				name: user.name,
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
				userId: user.id,
				name: user.name,
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
