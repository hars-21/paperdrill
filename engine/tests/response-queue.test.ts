import { expect, test } from "bun:test";
import { redisTtlSecondsFromMs } from "../src/util";

test("Redis TTLs are rounded up to whole seconds", () => {
	expect(redisTtlSecondsFromMs(60_000)).toBe(60);
	expect(redisTtlSecondsFromMs(1_001)).toBe(2);
	expect(redisTtlSecondsFromMs(0)).toBe(1);
	expect(redisTtlSecondsFromMs(-5)).toBe(1);
});
