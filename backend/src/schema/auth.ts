import z from "zod";

export const signupSchema = z.object({
	email: z.email().trim().min(1, "email is required"),
	name: z.string().trim().min(1, "name is required"),
	password: z.string().min(1, "password is required"),
});

export const signinSchema = z.object({
	email: z.email().trim().min(1, "email is required"),
	password: z.string().min(1, "password is required"),
});
