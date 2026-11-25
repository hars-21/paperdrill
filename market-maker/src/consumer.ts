import type { RedisClientType } from "redis";
import { reviveEventRecord } from "./events";
import type { MakerState } from "./state";

type ReadClient = Pick<RedisClientType, "get" | "set" | "xRead">;

export interface EventConsumerConfig {
	stream: string;
	cursorKey: string;
	blockMs: number;
	batchSize: number;
}

export interface EventConsumerDeps {
	client: ReadClient;
	config: EventConsumerConfig;
	state: MakerState;
	isAborted: () => boolean;
	onError: (message: string, error: unknown) => void;
}

export async function consumeEvents({
	client,
	config,
	state,
	isAborted,
	onError,
}: EventConsumerDeps): Promise<void> {
	let cursor = (await client.get(config.cursorKey)) ?? "0-0";

	while (!isAborted()) {
		try {
			const streams = await client.xRead(
				{ key: config.stream, id: cursor },
				{ BLOCK: config.blockMs, COUNT: config.batchSize },
			);

			if (!streams) continue;

			for (const stream of streams) {
				for (const message of stream.messages) {
					const raw = message.message?.data;
					if (typeof raw === "string") {
						try {
							state.apply(reviveEventRecord(raw));
						} catch (err) {
							onError("Skipping malformed engine event", err);
						}
					}
					cursor = message.id;
				}
			}

			// Order ids are absolute and balances are snapshots, so replaying a
			// batch after a crash is idempotent.
			await client.set(config.cursorKey, cursor);
		} catch (err) {
			if (isAborted()) break;
			onError("Engine event consumer error", err);
		}
	}
}
