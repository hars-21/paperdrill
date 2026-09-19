import { config } from "../config";
import { captureEngineException } from "../instrument";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level: LogLevel, message: string, meta?: unknown) {
	if (LEVEL[level] < LEVEL[config.logLevel]) return;
	if (level === "error" && meta instanceof Error) {
		captureEngineException(meta, { tags: { source: "engine_logger" } });
	}
	const ts = new Date().toISOString();
	const prefix = `[${ts}] [${level.toUpperCase()}]`;
	const details =
		meta instanceof Error ? { name: meta.name, message: meta.message, stack: meta.stack } : meta;

	const line =
		details !== undefined
			? `${prefix} ${message} ${JSON.stringify(details)}`
			: `${prefix} ${message}`;
	if (level === "error") console.error(line);
	else console.log(line);
}

export const logger = {
	debug: (message: string, meta?: unknown) => log("debug", message, meta),
	info: (message: string, meta?: unknown) => log("info", message, meta),
	warn: (message: string, meta?: unknown) => log("warn", message, meta),
	error: (message: string, meta?: unknown) => log("error", message, meta),
};
