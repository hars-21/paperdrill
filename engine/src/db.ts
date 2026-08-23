import { Pool } from "pg";
import { config } from "./config";
import { logger } from "./util/logger";

export const pool = new Pool({
	connectionString: config.databaseUrl,
	...(config.env === "production" && { ssl: { rejectUnauthorized: true } }),
});

export async function connectDB() {
	try {
		await pool.query("SELECT 1");
		logger.info("Connected to database");
	} catch (err) {
		logger.error("Failed to connect to database", err);
		throw err;
	}
}

export async function disconnectDB() {
	await pool.end();
}
