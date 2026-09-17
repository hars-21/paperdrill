import { env } from "../setup/env";
import { waitFor } from "./wait-for";

export class WebSocketProbe {
	private readonly messages: unknown[] = [];

	private constructor(readonly socket: WebSocket) {
		socket.addEventListener("message", (event) => {
			try {
				this.messages.push(JSON.parse(String(event.data)));
			} catch {}
		});
	}

	static async connect(): Promise<WebSocketProbe> {
		const socket = new WebSocket(env.wsUrl);
		const probe = new WebSocketProbe(socket);

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timed out opening WebSocket")), 5000);
			socket.addEventListener(
				"open",
				() => {
					clearTimeout(timeout);
					resolve();
				},
				{ once: true },
			);
			socket.addEventListener(
				"error",
				() => {
					clearTimeout(timeout);
					reject(new Error("WebSocket connection failed"));
				},
				{ once: true },
			);
		});

		return probe;
	}

	async subscribe(channel: string): Promise<void> {
		this.socket.send(JSON.stringify({ method: "SUBSCRIBE", params: [channel] }));

		this.socket.send("{");
		await this.next<{ error: string }>(
			(message) =>
				typeof message === "object" &&
				message !== null &&
				"error" in message &&
				message.error === "Invalid JSON",
			`subscription to ${channel}`,
		);
	}

	next<T>(accept: (message: unknown) => boolean, description: string): Promise<T> {
		return waitFor(
			async () => this.messages.find(accept),
			(message) => message !== undefined,
			{ description, timeoutMs: 8000, intervalMs: 25 },
		) as Promise<T>;
	}

	close() {
		this.socket.close();
	}
}
