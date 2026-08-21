import type { EngineEvent } from "../types/event";
import { logger } from "../util/logger";

type EventHandler = (event: EngineEvent) => void | Promise<void>;

const listeners = new Map<string, EventHandler[]>();

export function onEvent(type: EngineEvent["type"], handler: EventHandler) {
	const list = listeners.get(type) ?? [];
	list.push(handler);
	listeners.set(type, list);
}

export function emitEvent(event: EngineEvent) {
	const handlers = listeners.get(event.type);
	if (!handlers) return;

	for (const handler of handlers) {
		try {
			const result = handler(event);
			if (result instanceof Promise) {
				result.catch((err) => {
					logger.error(`Event handler error for ${event.type}`, err);
				});
			}
		} catch (err) {
			logger.error(`Event handler error for ${event.type}`, err);
		}
	}
}
