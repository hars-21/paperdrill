import { onEvent } from "./eventBus";
import { publishDepth, publishFill, streamEvent } from "../redis/publish";
import type { EngineEvent } from "../types/event";

onEvent("order.created", (event: EngineEvent) => {
	if (event.type !== "order.created") return;
	streamEvent({ event: "order", order: event.order });
});

onEvent("order.filled", (event: EngineEvent) => {
	if (event.type !== "order.filled") return;
	streamEvent({ event: "order", order: event.order });
});

onEvent("order.partially_filled", (event: EngineEvent) => {
	if (event.type !== "order.partially_filled") return;
	streamEvent({ event: "order", order: event.order });
});

onEvent("order.cancelled", (event: EngineEvent) => {
	if (event.type !== "order.cancelled") return;
	streamEvent({ event: "order", order: event.order });
});

onEvent("fill.created", (event: EngineEvent) => {
	if (event.type !== "fill.created") return;
	publishFill(event.fill);
});

onEvent("depth.changed", (event: EngineEvent) => {
	if (event.type !== "depth.changed") return;
	publishDepth({ symbol: event.symbol, price: event.price, qty: event.qty, side: event.side });
});
