export function scaleFactor(precision: number): bigint {
	return 10n ** BigInt(precision);
}

export function toScaled(value: string, precision: number): bigint {
	const [integer = "0", fractional = ""] = value.split(".");
	if (fractional.length > precision) {
		throw new Error(`Value ${value} exceeds precision of ${precision} decimal places`);
	}
	return BigInt(integer + fractional.padEnd(precision, "0"));
}

export function fromScaled(value: bigint, precision: number): string {
	if (precision === 0) return value.toString();

	const sign = value < 0n ? "-" : "";
	const padded = (value < 0n ? -value : value).toString().padStart(precision + 1, "0");
	const dot = padded.length - precision;
	return `${sign}${padded.slice(0, dot)}.${padded.slice(dot)}`;
}

export function toNumber(value: bigint, precision: number): number {
	return Number(fromScaled(value, precision));
}

export function scaledFromNumber(value: number, precision: number): bigint {
	if (!Number.isFinite(value)) throw new Error(`Cannot scale non-finite value: ${value}`);
	return BigInt(Math.round(value * Number(scaleFactor(precision))));
}

export function scaledDown(value: number, precision: number): bigint {
	if (!Number.isFinite(value)) throw new Error(`Cannot scale non-finite value: ${value}`);
	return BigInt(Math.floor(value * Number(scaleFactor(precision))));
}

export function divRound(numerator: bigint, denominator: bigint): bigint {
	if (denominator === 0n) throw new Error("Division by zero");

	const negative = (numerator < 0n) !== (denominator < 0n);
	const absoluteNumerator = numerator < 0n ? -numerator : numerator;
	const absoluteDenominator = denominator < 0n ? -denominator : denominator;
	const quotient = absoluteNumerator / absoluteDenominator;
	const remainder = absoluteNumerator % absoluteDenominator;
	const rounded = remainder * 2n >= absoluteDenominator ? quotient + 1n : quotient;
	return negative ? -rounded : rounded;
}

export function applyBps(value: bigint, basisPoints: number): bigint {
	const multiplier = 10_000n + BigInt(Math.trunc(basisPoints));
	if (multiplier <= 0n) throw new Error(`Invalid basis-point adjustment: ${basisPoints}`);
	return divRound(value * multiplier, 10_000n);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
