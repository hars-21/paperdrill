import { unlink } from "node:fs/promises";
import { pool } from "./db";
import { cacheClient } from "./redis/client";
import { logger } from "./util/logger";

const HEALTH_FILE = "/tmp/health";
const HEALTH_INTERVAL_MS = 10_000;

let healthInterval: ReturnType<typeof setInterval> | undefined;
let healthCheck: Promise<void> | undefined;

function refreshHealth() {
	if (healthCheck) return healthCheck;

	healthCheck = (async () => {
		await Promise.all([pool.query("SELECT 1"), cacheClient.ping()]);
		await Bun.write(HEALTH_FILE, Date.now().toString());
	})().finally(() => {
		healthCheck = undefined;
	});

	return healthCheck;
}

export async function startHealth() {
	await refreshHealth();
	healthInterval = setInterval(() => {
		void refreshHealth().catch((error) => logger.error("Engine health check failed", error));
	}, HEALTH_INTERVAL_MS);
}

export async function stopHealth() {
	if (healthInterval) clearInterval(healthInterval);
	healthInterval = undefined;
	await healthCheck?.catch(() => undefined);
	await unlink(HEALTH_FILE).catch(() => undefined);
}
