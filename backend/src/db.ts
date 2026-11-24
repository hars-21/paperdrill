import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./config";

const adapter = new PrismaPg({
	connectionString: config.db.url,
	...(config.app.env === "production" && {
		ssl: { rejectUnauthorized: true },
	}),
});

export const prisma = new PrismaClient({
	adapter,
});
