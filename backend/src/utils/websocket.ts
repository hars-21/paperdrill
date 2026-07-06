import WebSocket, { WebSocketServer } from "ws";
import { logger } from "./logger";

export const activeSubscriptions: Record<string, WebSocket[]> = {};

export function subscriptionHandler(server: WebSocketServer) {
	server.on("connection", (socket) => {
		socket.on("message", (data) => {
			try {
				const parsedData = JSON.parse(data.toString());

				if (parsedData.method === "SUBSCRIBE") {
					parsedData.params.forEach((param: string) => {
						if (!activeSubscriptions[param]) {
							activeSubscriptions[param] = [];
						}

						activeSubscriptions[param].push(socket);
					});
				}

				if (parsedData.method === "UNSUBSCRIBE") {
					parsedData.params.forEach((param: string) => {
						if (!activeSubscriptions[param]) {
							activeSubscriptions[param] = [];
						}

						activeSubscriptions[param] = activeSubscriptions[param].filter((x) => x !== socket);
					});
				}
			} catch (err) {
				logger.warn("Invalid WebSocket message", { error: (err as Error).message });
				socket.send(JSON.stringify({ error: "Invalid JSON" }));
			}
		});

		socket.on("close", () => {
			for (const key of Object.keys(activeSubscriptions)) {
				const sockets = activeSubscriptions[key];
				if (!sockets) continue;

				activeSubscriptions[key] = sockets.filter((x) => x !== socket);

				if (activeSubscriptions[key].length === 0) {
					delete activeSubscriptions[key];
				}
			}
		});

		socket.on("error", (err) => {
			logger.error("WebSocket connection error", err);
		});
	});
}
