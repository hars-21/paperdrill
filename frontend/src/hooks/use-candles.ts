import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/types";
import { api } from "@/lib/api";
import { wsManager } from "@/lib/ws";

export const CANDLE_INTERVALS = ["15M", "1H", "4H", "1D"] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

export const CANDLE_INTERVAL_MS: Record<CandleInterval, number> = {
	"15M": 15 * 60 * 1000,
	"1H": 60 * 60 * 1000,
	"4H": 4 * 60 * 60 * 1000,
	"1D": 24 * 60 * 60 * 1000,
};

function getBucketStart(ms: number, intMs: number) {
	return ms - (ms % intMs);
}

function fillCandleGaps(candles: Candle[], intMs: number): Candle[] {
	if (candles.length < 2) return candles;
	const s = [...candles].sort((a, b) => a.time - b.time);
	const f = s[0];
	if (!f) return candles;
	const r: Candle[] = [f];
	for (let i = 1; i < s.length; i++) {
		const p = r[r.length - 1]!;
		const c = s[i]!;
		let g = p.time + intMs;
		while (g < c.time) {
			r.push({
				time: g,
				open: p.close,
				high: p.close,
				low: p.close,
				close: p.close,
				volume: "0",
				symbol: p.symbol || "",
			});
			g += intMs;
		}
		r.push(c);
	}
	return r;
}

function mergeMinuteCandle(into: Candle[], inc: Candle, intMs: number): Candle[] {
	const bs = getBucketStart(inc.time, intMs);
	const c = [...into];
	const l = c[c.length - 1];
	if (l) {
		let g = l.time + intMs;
		while (g < bs) {
			c.push({
				time: g,
				open: l.close,
				high: l.close,
				low: l.close,
				close: l.close,
				volume: "0",
				symbol: inc.symbol,
			});
			g += intMs;
		}
	}
	const b = c.find((x) => x.time === bs);
	if (b) {
		b.high = Number(inc.high) > Number(b.high) ? inc.high : b.high;
		b.low = Number(inc.low) < Number(b.low) ? inc.low : b.low;
		b.close = inc.close;
		b.volume = String(Number(b.volume) + Number(inc.volume));
	} else {
		c.push({ ...inc, time: bs });
	}
	return c;
}

export function useCandles(symbol: string, interval: CandleInterval = "1H") {
	const [candles, setCandles] = useState<Candle[]>([]);
	const [lastCandle, setLastCandle] = useState<Candle | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const candlesRef = useRef<Candle[]>([]);
	const intervalRef = useRef(interval);
	intervalRef.current = interval;

	useEffect(() => {
		let active = true;
		setLoading(true);
		setCandles([]);
		setLastCandle(null);
		setError(null);
		candlesRef.current = [];

		const intMs = CANDLE_INTERVAL_MS[interval];

		api
			.getCandles(symbol, interval)
			.then((res) => {
				if (!active) return;
				const data = res?.data ?? [];
				const raw: Candle[] = data.map((c) => ({ ...c, symbol, time: c.time }));
				const filled = fillCandleGaps(raw, intMs);
				candlesRef.current = filled;
				setCandles(filled);
				const last = filled[filled.length - 1];
				if (last) setLastCandle(last);
			})
			.catch((err) => {
				if (!active) return;
				setError(err instanceof Error ? err.message : "Failed to load candles");
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		const unsubscribe = wsManager.subscribe(`candle:${symbol}`, (raw: unknown) => {
			if (!raw) return;
			const candle = raw as Candle;
			if (!candle.time || candle.open === undefined || candle.close === undefined) return;
			const m = CANDLE_INTERVAL_MS[intervalRef.current];
			const merged = mergeMinuteCandle(candlesRef.current, candle, m);
			candlesRef.current = merged;
			setCandles(merged);
			setLastCandle(candle);
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, [symbol, interval]);

	const hasData = useMemo(
		() => candles.length > 0 || lastCandle !== null,
		[candles.length, lastCandle],
	);

	return { candles, lastCandle, loading, error, hasData };
}
