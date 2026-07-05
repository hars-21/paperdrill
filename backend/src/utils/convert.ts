export const toBigInt = (value: string, precision: number): bigint => {
	const [integer = "0", fractional = ""] = value.split(".");

	if (fractional.length > precision) {
		throw new Error(`Value ${value} exceeds precision of ${precision} decimal places`);
	}

	const scaled = integer + fractional.padEnd(precision, "0");
	return BigInt(scaled);
};

export const fromBigInt = (value: bigint, precision: number): string => {
	const padded = value.toString().padStart(precision + 1, "0");
	const dot = padded.length - precision;

	const integer = padded.slice(0, dot);
	const fraction = padded.slice(dot);

	return integer + "." + fraction;
};
