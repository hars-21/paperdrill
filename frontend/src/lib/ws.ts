import { config } from "./env";

type Handler = (data: unknown) => void;
type TicketProvider = () => Promise<string | null>;

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;
const PRIVATE_PREFIX = "account:";

function isPrivateChannel(channel: string) {
	return channel.startsWith(PRIVATE_PREFIX);
}

function messageChannel(data: Record<string, unknown>) {
	if (data.event) return `${data.event}:${data.symbol}`;
	if (typeof data.channel === "string") return data.channel;
	if (typeof data.userId === "string") return `${PRIVATE_PREFIX}${data.userId}`;
	return null;
}

class WebSocketManager {
	private socket: WebSocket | null = null;
	private subscriptions = new Map<string, Set<Handler>>();
	private retryCount = 0;
	private retryTimer: ReturnType<typeof setTimeout> | null = null;
	private isIntentionallyClosed = false;
	private connecting = false;
	private authorized = false;
	private ticketProvider: TicketProvider | null = null;

	/**
	 * Private account channels need a fresh single-use ticket on every
	 * connection. The provider is installed by the authenticated account stream
	 * and cleared on sign out.
	 */
	setTicketProvider(provider: TicketProvider | null) {
		this.ticketProvider = provider;

		if (provider && this.needsTicket() && !this.authorized) {
			this.reconnect();
		}
	}

	private needsTicket() {
		for (const channel of this.subscriptions.keys()) {
			if (isPrivateChannel(channel)) return true;
		}
		return false;
	}

	private reconnect() {
		this.closeSocket();
		this.isIntentionallyClosed = false;
		this.connect();
	}

	private closeSocket() {
		const socket = this.socket;
		this.socket = null;
		this.authorized = false;
		if (!socket) return;

		socket.onopen = null;
		socket.onmessage = null;
		socket.onerror = null;
		socket.onclose = null;

		try {
			socket.close();
		} catch {}
	}

	private connect() {
		if (this.connecting) return;

		if (this.socket) {
			const openish = this.socket.readyState <= WebSocket.OPEN;
			if (openish && (!this.needsTicket() || this.authorized)) return;
			this.closeSocket();
		}

		this.connecting = true;
		const needsTicket = this.needsTicket() && Boolean(this.ticketProvider);

		void (async () => {
			let ticket: string | null = null;

			if (needsTicket && this.ticketProvider) {
				try {
					ticket = await this.ticketProvider();
				} catch (err) {
					console.error("WS ticket request failed:", err);
					this.connecting = false;
					this.scheduleReconnect();
					return;
				}
			}

			const url = ticket
				? `${config.wsUrl}?ticket=${encodeURIComponent(ticket)}`
				: config.wsUrl;
			const socket = new WebSocket(url);
			this.socket = socket;
			this.authorized = Boolean(ticket);
			this.connecting = false;

			socket.onopen = () => {
				if (this.socket !== socket) return;

				this.retryCount = 0;

				// A subscription can arrive while the ticket request is in flight.
				// Reconnect once with a ticket instead of leaving a private channel
				// on an anonymous connection.
				if (this.needsTicket() && !this.authorized && this.ticketProvider) {
					this.reconnect();
					return;
				}

				const channels = Array.from(this.subscriptions.keys());
				if (channels.length > 0) {
					this.send({ method: "SUBSCRIBE", params: channels });
				}
			};

			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as unknown;
					if (!data || typeof data !== "object") return;

					const channel = messageChannel(data as Record<string, unknown>);
					if (!channel) return;

					this.subscriptions.get(channel)?.forEach((handler) => handler(data));
				} catch (err) {
					console.error("WS message parse error:", err, event.data);
				}
			};

			socket.onclose = () => {
				if (this.socket !== socket) return;

				this.socket = null;
				this.authorized = false;
				this.connecting = false;

				if (this.isIntentionallyClosed || this.subscriptions.size === 0) return;
				this.scheduleReconnect();
			};

			socket.onerror = () => {
				socket.close();
			};
		})();
	}

	private scheduleReconnect() {
		if (this.retryCount >= MAX_RETRIES) return;

		const delay = BACKOFF_BASE_MS * 2 ** this.retryCount;
		this.retryTimer = setTimeout(() => {
			this.retryCount++;
			this.connect();
		}, delay);
	}

	private send(msg: object) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(msg));
		}
	}

	subscribe(channel: string, handler: Handler): () => void {
		const known = this.subscriptions.has(channel);

		if (!known) {
			this.subscriptions.set(channel, new Set());
		}
		this.subscriptions.get(channel)!.add(handler);

		const needsTicket = this.needsTicket();
		const mustAuthorize = needsTicket && !this.authorized;

		if (mustAuthorize) {
			this.reconnect();
		} else if (this.socket?.readyState === WebSocket.OPEN) {
			if (!known) this.send({ method: "SUBSCRIBE", params: [channel] });
		} else {
			this.isIntentionallyClosed = false;
			this.connect();
		}

		return () => this.unsubscribe(channel, handler);
	}

	private unsubscribe(channel: string, handler: Handler) {
		const handlers = this.subscriptions.get(channel);
		if (!handlers) return;

		handlers.delete(handler);
		if (handlers.size === 0) {
			this.subscriptions.delete(channel);
			this.send({ method: "UNSUBSCRIBE", params: [channel] });
		}
		if (this.subscriptions.size === 0) {
			this.disconnect();
		}
	}

	private disconnect() {
		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}

		this.isIntentionallyClosed = true;
		this.connecting = false;
		this.closeSocket();
	}
}

export const wsManager = new WebSocketManager();
