import { config } from "../config";
import { streamProducer } from "../redis/client";
import { bigintReplacer } from "../util";
import { logger } from "../util/logger";
import { ENGINE_EVENT_VERSION, type EngineEvent, type EngineEventRecord } from "../types/event";

let writeChain: Promise<void> = Promise.resolve();

function occurredAt(event: EngineEvent): number {
	if (event.type === "balance.changed") return event.occurredAt;
	if (event.type === "fill.created") return event.fill.createdAt;
	return Date.now();
}

export function buildEventRecord(event: EngineEvent): EngineEventRecord {
	return {
		id: crypto.randomUUID(),
		type: event.type,
		version: ENGINE_EVENT_VERSION,
		occurredAt: occurredAt(event),
		event,
	};
}

async function writeEvent(record: EngineEventRecord) {
	if (!streamProducer.isOpen) return;

	await streamProducer.xAdd(
		config.eventStream,
		"*",
		{
			data: JSON.stringify(record, bigintReplacer),
		},
		{
			TRIM: {
				strategy: "MAXLEN",
				strategyModifier: "~",
				threshold: config.eventStreamMaxLen,
			},
		},
	);
}

export function appendEvent(event: EngineEvent): EngineEventRecord {
	const record = buildEventRecord(event);

	writeChain = writeChain
		.then(() => writeEvent(record))
		.catch((err) => logger.error(`Failed to append ${event.type} event`, err));

	return record;
}

export function flushEvents() {
	return writeChain;
}

let trimTimer: ReturnType<typeof setInterval> | undefined;

export function startEventStreamTrim() {
	if (trimTimer) return;

	trimTimer = setInterval(() => {
		void Promise.all([
			streamProducer.xTrim(config.eventStream, "MAXLEN", config.eventStreamMaxLen, {
				strategyModifier: "~",
				LIMIT: 10_000,
			}),
			streamProducer.xTrim(
				config.eventStream,
				"MINID",
				Date.now() - config.eventStreamRetentionMs,
				{ strategyModifier: "~", LIMIT: 10_000 },
			),
		]).catch((err) => logger.error("Failed to trim event stream", err));
	}, config.eventStreamTrimIntervalMs);
	trimTimer.unref();
}

export function stopEventStreamTrim() {
	if (!trimTimer) return;
	clearInterval(trimTimer);
	trimTimer = undefined;
}
