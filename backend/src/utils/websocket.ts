import crypto from "crypto";
import type { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { cacheClient } from "../redis";
import { logger } from "./logger";

const TICKET_PREFIX = "ws:ticket:";
const TICKET_TTL_SECONDS = 60;
const ACCOUNT_CHANNEL_PREFIX = "account:";

export const activeSubscriptions: Record<string, WebSocket[]> = {};

export function accountChannel(userId: string) {
	return `${ACCOUNT_CHANNEL_PREFIX}${userId}`;
}

export function isPrivateChannel(channel: string) {
	return channel.startsWith(ACCOUNT_CHANNEL_PREFIX);
}

/**
 * Mint a single-use ticket that lets one WebSocket connection subscribe to a
 * user's private account channel. The ticket is deliberately short-lived and
 * never contains the session token, so it cannot be reused across connections
 * or leak through WebSocket URLs.
 */
export async function issueAccountTicket(userId: string) {
	const ticket = crypto.randomBytes(32).toString("hex");

	await cacheClient.set(`${TICKET_PREFIX}${ticket}`, userId, {
		EX: TICKET_TTL_SECONDS,
	});

	return {
		ticket,
		expiresAt: new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString(),
	};
}

async function consumeAccountTicket(ticket: string) {
	const userId = await cacheClient.getDel(`${TICKET_PREFIX}${ticket}`);
	return userId ?? null;
}

function subscribeChannel(channel: string, socket: WebSocket) {
	const sockets = activeSubscriptions[channel] ?? [];

	if (!sockets.includes(socket)) sockets.push(socket);
	activeSubscriptions[channel] = sockets;
}

function unsubscribeChannel(channel: string, socket: WebSocket) {
	const sockets = activeSubscriptions[channel];
	if (!sockets) return;

	const remaining = sockets.filter((entry) => entry !== socket);
	if (remaining.length === 0) delete activeSubscriptions[channel];
	else activeSubscriptions[channel] = remaining;
}

function ticketFrom(request: IncomingMessage) {
	if (!request.url) return null;

	try {
		return new URL(request.url, "http://localhost").searchParams.get("ticket");
	} catch {
		return null;
	}
}

async function authorize(socket: WebSocket, request: IncomingMessage) {
	const owned = new Set<string>();
	const ticket = ticketFrom(request);
	if (!ticket) return owned;

	try {
		const userId = await consumeAccountTicket(ticket);
		if (!userId || socket.readyState !== WebSocket.OPEN) return owned;

		const channel = accountChannel(userId);
		owned.add(channel);
		subscribeChannel(channel, socket);
		socket.send(JSON.stringify({ type: "subscribed", channel }));
	} catch (err) {
		logger.warn("Failed to authorize WebSocket ticket", {
			error: err instanceof Error ? err.message : String(err),
		});
	}

	return owned;
}

export function subscriptionHandler(server: WebSocketServer) {
	server.on("connection", (socket, request) => {
		const owned: Promise<Set<string>> = authorize(socket, request);

		socket.on("message", (data) => {
			try {
				const parsedData = JSON.parse(data.toString());
				const params: unknown[] = Array.isArray(parsedData.params)
					? parsedData.params
					: [];

				if (parsedData.method === "SUBSCRIBE") {
					void owned.then((channels) => {
						for (const param of params) {
							if (typeof param !== "string") continue;

							if (isPrivateChannel(param) && !channels.has(param)) {
								socket.send(
									JSON.stringify({
										error: "SUBSCRIPTION_FORBIDDEN",
										channel: param,
									}),
								);
								continue;
							}

							subscribeChannel(param, socket);
						}
					});
				}

				if (parsedData.method === "UNSUBSCRIBE") {
					for (const param of params) {
						if (typeof param !== "string") continue;
						unsubscribeChannel(param, socket);
					}
				}
			} catch (err) {
				logger.warn("Invalid WebSocket message", { error: (err as Error).message });
				socket.send(JSON.stringify({ error: "Invalid JSON" }));
			}
		});

		socket.on("close", () => {
			for (const key of Object.keys(activeSubscriptions)) {
				unsubscribeChannel(key, socket);
			}
		});

		socket.on("error", (err) => {
			logger.error("WebSocket connection error", err);
		});
	});
}
