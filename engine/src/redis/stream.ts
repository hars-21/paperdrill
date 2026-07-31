import type { StreamEventMessage } from "../types/event";
import { streamProducer } from "./client";
import { config } from "../config";

export function bigintReplacer(_key: string, value: unknown) {
	return typeof value === "bigint" ? value.toString() : value;
}

export async function streamEvent(message: StreamEventMessage) {
	if (!streamProducer.isOpen) {
		return;
	}

	await streamProducer.xAdd(
		`stream:${message.event}`,
		"*",
		{
			data: JSON.stringify(message, bigintReplacer),
		},
		{
			TRIM: {
				strategy: "MINID",
				strategyModifier: "=",
				threshold: Date.now() - config.streamRetentionMs,
			},
		},
	);
}
