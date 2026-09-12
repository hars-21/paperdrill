export async function waitFor<T>(
	probe: () => Promise<T>,
	accept: (value: T) => boolean,
	options: { description: string; timeoutMs?: number; intervalMs?: number },
): Promise<T> {
	const timeoutMs = options.timeoutMs ?? 8000;
	const intervalMs = options.intervalMs ?? 50;
	const deadline = Date.now() + timeoutMs;
	let lastValue: T | undefined;
	let lastError: unknown;

	while (Date.now() < deadline) {
		try {
			lastValue = await probe();
			if (accept(lastValue)) return lastValue;
		} catch (error) {
			lastError = error;
		}

		await Bun.sleep(intervalMs);
	}

	const detail = lastError instanceof Error ? lastError.message : JSON.stringify(lastValue);
	throw new Error(`Timed out waiting for ${options.description}; last result: ${detail}`);
}
