import { config } from "./config";

function fields(extra?: Record<string, unknown>) {
	if (!extra) return "";
	return ` ${JSON.stringify(extra)}`;
}

export const logger = {
	info(message: string, extra?: Record<string, unknown>) {
		console.log(`[market-maker] ${message}${fields(extra)}`);
	},
	debug(message: string, extra?: Record<string, unknown>) {
		if (config.logLevel === "debug") console.log(`[market-maker] ${message}${fields(extra)}`);
	},
	error(message: string, error?: unknown, extra?: Record<string, unknown>) {
		const detail = error instanceof Error ? error.message : error ? String(error) : undefined;
		console.error(`[market-maker] ${message}${fields({ ...extra, error: detail })}`);
	},
};
