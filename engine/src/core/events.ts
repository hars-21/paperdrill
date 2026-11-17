import { onAnyEvent, onEvent } from "./eventBus";
import { appendEvent } from "./eventLog";
import { publishDepth, publishFill } from "../redis/publish";
import type { EngineEvent } from "../types/event";

export function registerEventHandlers() {
	onAnyEvent((event: EngineEvent) => {
		if (event.type === "depth.changed") return;
		appendEvent(event);
	});

	onEvent("fill.created", (event: EngineEvent) => {
		if (event.type !== "fill.created") return;
		publishFill(event.fill);
	});

	onEvent("depth.changed", (event: EngineEvent) => {
		if (event.type !== "depth.changed") return;
		publishDepth({ symbol: event.symbol, price: event.price, qty: event.qty, side: event.side });
	});
}
