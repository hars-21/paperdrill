import type { StreamEventMessage } from "../types/event";
import { streamProducer } from "./client";

export function bigintReplacer(_key: string, value: unknown) {
	return typeof value === "bigint" ? value.toString() : value;
}

export async function streamEvent(message: StreamEventMessage) {
	if (!streamProducer.isOpen) {
		return;
	}

	await streamProducer.xAdd(`stream:${message.event}`, "*", {
		data: JSON.stringify(message, bigintReplacer),
	});
}
