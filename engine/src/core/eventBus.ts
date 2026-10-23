import type { EngineEvent } from "../types/event";
import { logger } from "../util/logger";

type EventHandler = (event: EngineEvent) => void | Promise<void>;

const listeners = new Map<string, EventHandler[]>();
const anyListeners: EventHandler[] = [];

export function onEvent(type: EngineEvent["type"], handler: EventHandler) {
	const list = listeners.get(type) ?? [];
	list.push(handler);
	listeners.set(type, list);

	return () => {
		const index = list.indexOf(handler);
		if (index >= 0) list.splice(index, 1);
	};
}

export function onAnyEvent(handler: EventHandler) {
	anyListeners.push(handler);

	return () => {
		const index = anyListeners.indexOf(handler);
		if (index >= 0) anyListeners.splice(index, 1);
	};
}

function runHandlers(handlers: EventHandler[], event: EngineEvent) {
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

export function emitEvent(event: EngineEvent) {
	runHandlers(listeners.get(event.type) ?? [], event);
	runHandlers(anyListeners, event);
}
