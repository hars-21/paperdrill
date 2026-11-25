import { expect, test } from "bun:test";
import { applyBps, divRound, fromScaled, scaledDown, scaledFromNumber, toScaled } from "../src/decimal";

test("decimal strings scale with market precision", () => {
	expect(toScaled("67500.25", 2)).toBe(6_750_025n);
	expect(toScaled("0.2500", 4)).toBe(2_500n);
	expect(() => toScaled("0.12345", 4)).toThrow();
});

test("scaled integers format back to decimal strings", () => {
	expect(fromScaled(6_750_025n, 2)).toBe("67500.25");
	expect(fromScaled(2_500n, 4)).toBe("0.2500");
	expect(fromScaled(42n, 0)).toBe("42");
});

test("numbers scale with round-half-away-from-zero", () => {
	expect(scaledFromNumber(1.2345, 2)).toBe(123n);
	expect(scaledFromNumber(1.235, 2)).toBe(124n);
	expect(scaledFromNumber(0.00001, 4)).toBe(0n);
	expect(scaledDown(0.001481, 4)).toBe(14n);
});

test("division rounds half away from zero", () => {
	expect(divRound(5n, 2n)).toBe(3n);
	expect(divRound(-5n, 2n)).toBe(-3n);
	expect(divRound(4n, 2n)).toBe(2n);
});

test("basis-point shifts preserve price scale", () => {
	expect(applyBps(60_000_00n, 10)).toBe(60_060_00n);
	expect(applyBps(60_000_00n, -10)).toBe(59_940_00n);
	expect(applyBps(100n, 0)).toBe(100n);
});
