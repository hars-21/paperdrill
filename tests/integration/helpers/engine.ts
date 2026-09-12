import { createClient, type RedisClientType } from "redis";
import { env } from "../setup/env";
import { waitFor } from "./wait-for";

export interface EngineResponse<T> {
	correlationId: string;
	success: boolean;
	data?: T;
	error?: string;
}

export interface BrokerCommand {
	correlationId: string;
	responseQueue: string;
	type: string;
	payload: Record<string, unknown>;
}

export class EngineClient {
	readonly redis: RedisClientType;

	constructor() {
		this.redis = createClient({ url: env.redisUrl });
	}

	connect() {
		return this.redis.connect();
	}

	async close() {
		if (this.redis.isOpen) await this.redis.quit();
	}

	async request<T>(type: string, payload: Record<string, unknown>) {
		const correlationId = crypto.randomUUID();
		const responseQueue = `integration-response-${correlationId}`;

		await this.redis.xAdd(env.incomingStream, "*", {
			correlationId,
			responseQueue,
			type,
			payload: JSON.stringify(payload),
		});

		const result = await this.redis.brPop(responseQueue, 5);
		await this.redis.del(responseQueue);
		if (!result) throw new Error(`Engine did not respond to ${type}`);

		const response = JSON.parse(result.element) as EngineResponse<T>;
		return { correlationId, responseQueue, response };
	}

	async command<T>(type: string, payload: Record<string, unknown>): Promise<T> {
		const { response } = await this.request<T>(type, payload);
		if (!response.success) throw new Error(response.error ?? `Engine command ${type} failed`);
		return response.data as T;
	}

	async findBrokerCommand(
		type: string,
		acceptPayload: (payload: Record<string, unknown>) => boolean,
	): Promise<BrokerCommand> {
		const command = await waitFor<BrokerCommand | undefined>(
			async () => {
				const entries = await this.redis.xRange(env.incomingStream, "-", "+");
				for (let index = entries.length - 1; index >= 0; index--) {
					const message = entries[index]?.message;
					if (
						!message ||
						message.type !== type ||
						!message.payload ||
						!message.correlationId ||
						!message.responseQueue
					) {
						continue;
					}
					const payload = JSON.parse(message.payload) as Record<string, unknown>;
					if (acceptPayload(payload)) {
						return {
							correlationId: message.correlationId,
							responseQueue: message.responseQueue,
							type: message.type,
							payload,
						};
					}
				}
				return undefined;
			},
			(value) => value !== undefined,
			{ description: `${type} command in broker stream` },
		);

		if (!command) throw new Error(`Missing ${type} broker command`);
		return command;
	}

	addStreamEvent(stream: "stream:order" | "stream:fill", event: Record<string, unknown>) {
		return this.redis.xAdd(stream, "*", { data: JSON.stringify(event) });
	}
}
