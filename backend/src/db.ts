import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({
	connectionString: config.db.url,
	...(config.app.env === "production" && {
		ssl: { rejectUnauthorized: true },
	}),
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
	adapter,
});
