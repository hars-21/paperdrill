import { expect, test } from "bun:test";
import { consumeEvents } from "../src/consumer";
import { MakerState } from "../src/state";

test("consumer applies a batch then checkpoints its own cursor", async () => {
	const state = new MakerState(new Set(["service-1"]));
	let aborted = false;
	let cursor = "10-0";
	const writes: string[] = [];

	const client = {
		get: async () => "10-0",
		set: async (_key: string, value: string) => {
			writes.push(value);
			cursor = value;
		},
		xRead: async () => {
			aborted = true;
			return [
				{
					name: "stream:engine-events",
					messages: [
						{
							id: "11-0",
							message: {
								data: JSON.stringify({
									id: "event-1",
									type: "balance.changed",
									version: 1,
									occurredAt: 1,
									event: {
										type: "balance.changed",
										userId: "service-1",
										asset: "USD",
										available: "5000",
										locked: "0",
										deltaAvailable: "5000",
										deltaLocked: "0",
										reason: "deposited",
										referenceId: null,
										symbol: null,
										occurredAt: 1,
									},
								}),
							},
						},
					],
				},
			];
		},
	};

	await consumeEvents({
		client: client as never,
		config: {
			stream: "stream:engine-events",
			cursorKey: "market-maker:event:last_id",
			blockMs: 100,
			batchSize: 10,
		},
		state,
		isAborted: () => aborted,
		onError: () => {},
	});

	expect(cursor).toBe("11-0");
	expect(writes).toEqual(["11-0"]);
	expect(state.balance("service-1", "USD").available).toBe(5_000n);
});

test("a malformed event is skipped without stalling later messages", async () => {
	const state = new MakerState(new Set(["service-1"]));
	let aborted = false;
	let cursor = "0-0";
	const errors: string[] = [];

	const client = {
		get: async () => null,
		set: async (_key: string, value: string) => {
			cursor = value;
		},
		xRead: async () => {
			aborted = true;
			return [
				{
					name: "stream:engine-events",
					messages: [
						{ id: "1-0", message: { data: "not-json" } },
						{
							id: "2-0",
							message: {
								data: JSON.stringify({
									id: "event-2",
									type: "balance.changed",
									version: 1,
									occurredAt: 1,
									event: {
										type: "balance.changed",
										userId: "service-1",
										asset: "USD",
										available: "7000",
										locked: "0",
										deltaAvailable: "7000",
										deltaLocked: "0",
										reason: "deposited",
										referenceId: null,
										symbol: null,
										occurredAt: 1,
									},
								}),
							},
						},
					],
				},
			];
		},
	};

	await consumeEvents({
		client: client as never,
		config: {
			stream: "stream:engine-events",
			cursorKey: "cursor",
			blockMs: 100,
			batchSize: 10,
		},
		state,
		isAborted: () => aborted,
		onError: (message) => errors.push(message),
	});

	expect(errors).toEqual(["Skipping malformed engine event"]);
	expect(cursor).toBe("2-0");
	expect(state.balance("service-1", "USD").available).toBe(7_000n);
});
