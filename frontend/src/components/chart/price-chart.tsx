import { useEffect, useRef } from "react";
import {
	CandlestickSeries,
	ColorType,
	CrosshairMode,
	HistogramSeries,
	LineStyle,
	createChart,
	type CandlestickData,
	type HistogramData,
	type IChartApi,
	type ISeriesApi,
	type Time,
} from "lightweight-charts";
import type { Candle } from "@/types";
import { useMarket } from "@/context/MarketContext";
import { useTheme } from "@/lib/theme-provider";
import {
	applyChartRange,
	formatChartTime,
	formatTick,
	getChartColors,
	type ChartRange,
} from "./chart-utils";

function candleData(candle: Candle): CandlestickData {
	return {
		time: Math.floor(candle.time / 1000) as Time,
		open: Number(candle.open),
		high: Number(candle.high),
		low: Number(candle.low),
		close: Number(candle.close),
	};
}

function volumeData(candle: Candle, up: string, down: string): HistogramData {
	return {
		time: Math.floor(candle.time / 1000) as Time,
		value: Number(candle.volume),
		color: Number(candle.close) >= Number(candle.open) ? up : down,
	};
}

function isRoutineUpdate(previous: Candle[], candles: Candle[]) {
	if (previous.length === 0 || candles.length === 0) return false;
	const sameBucket =
		previous.length === candles.length &&
		previous[previous.length - 1]?.time === candles[candles.length - 1]?.time;
	const appendedBucket =
		candles.length === previous.length + 1 &&
		previous[previous.length - 1]?.time === candles[candles.length - 2]?.time;
	return sameBucket || appendedBucket;
}

type PriceChartProps = {
	candles: Candle[];
	showVolume: boolean;
	range: ChartRange;
	resetKey: number;
	goLiveKey: number;
	symbol: string;
	onHover: (candle: Candle | null) => void;
};

export function PriceChart({
	candles,
	showVolume,
	range,
	resetKey,
	goLiveKey,
	symbol,
	onHover,
}: PriceChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
	const previousCandlesRef = useRef<Candle[]>([]);
	const candlesRef = useRef(candles);
	const rangeRef = useRef(range);
	const showVolumeRef = useRef(showVolume);
	const onHoverRef = useRef(onHover);
	candlesRef.current = candles;
	rangeRef.current = range;
	showVolumeRef.current = showVolume;
	onHoverRef.current = onHover;
	const { theme } = useTheme();
	const market = useMarket(symbol);
	const pricePrecision = market?.pricePrecision ?? 2;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		let chart: IChartApi | null = null;
		const frame = requestAnimationFrame(() => {
			const colors = getChartColors();
			chart = createChart(container, {
				autoSize: true,
				layout: {
					background: { type: ColorType.Solid, color: "transparent" },
					textColor: colors.text,
					fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
					fontSize: 11,
				},
				grid: {
					vertLines: { color: colors.grid, style: LineStyle.Solid },
					horzLines: { color: colors.grid, style: LineStyle.Solid },
				},
				crosshair: {
					mode: CrosshairMode.Normal,
					vertLine: {
						color: colors.crosshair,
						style: LineStyle.Dashed,
						labelBackgroundColor: colors.crosshair,
					},
					horzLine: {
						color: colors.crosshair,
						style: LineStyle.Dashed,
						labelBackgroundColor: colors.crosshair,
					},
				},
				rightPriceScale: {
					borderColor: colors.grid,
					scaleMargins: { top: 0.12, bottom: 0.25 },
				},
				timeScale: {
					borderColor: colors.grid,
					timeVisible: true,
					secondsVisible: false,
					rightOffset: 6,
					barSpacing: 8,
					minBarSpacing: 2,
					tickMarkFormatter: formatTick,
				},
				localization: { timeFormatter: formatChartTime },
			});
			const candleSeries = chart.addSeries(CandlestickSeries, {
				upColor: colors.up,
				downColor: colors.down,
				borderVisible: false,
				wickUpColor: colors.up,
				wickDownColor: colors.down,
				priceFormat: {
					type: "price",
					precision: pricePrecision,
					minMove: 10 ** -pricePrecision,
				},
				priceLineVisible: true,
				priceLineStyle: LineStyle.Dotted,
			});
			const volumeSeries = chart.addSeries(HistogramSeries, {
				priceFormat: { type: "volume" },
				priceScaleId: "volume",
				visible: showVolumeRef.current,
			});
			volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.83, bottom: 0 } });

			const currentCandles = candlesRef.current;
			candleSeries.setData(currentCandles.map(candleData));
			volumeSeries.setData(
				currentCandles.map((candle) => volumeData(candle, colors.volumeUp, colors.volumeDown)),
			);
			applyChartRange(chart, currentCandles, rangeRef.current);
			previousCandlesRef.current = currentCandles;

			chart.subscribeCrosshairMove((param) => {
				if (!param.time) {
					onHoverRef.current(null);
					return;
				}
				const time = Number(param.time) * 1000;
				onHoverRef.current(candlesRef.current.find((candle) => candle.time === time) ?? null);
			});

			chartRef.current = chart;
			candleSeriesRef.current = candleSeries;
			volumeSeriesRef.current = volumeSeries;
		});

		return () => {
			cancelAnimationFrame(frame);
			chart?.remove();
			chartRef.current = null;
			candleSeriesRef.current = null;
			volumeSeriesRef.current = null;
			previousCandlesRef.current = [];
		};
	}, [theme, pricePrecision]);

	useEffect(() => {
		const candleSeries = candleSeriesRef.current;
		const volumeSeries = volumeSeriesRef.current;
		const chart = chartRef.current;
		if (!candleSeries || !volumeSeries || !chart) return;
		const colors = getChartColors();
		const previous = previousCandlesRef.current;

		if (isRoutineUpdate(previous, candles)) {
			const candle = candles[candles.length - 1];
			if (candle) {
				candleSeries.update(candleData(candle));
				volumeSeries.update(volumeData(candle, colors.volumeUp, colors.volumeDown));
			}
		} else {
			candleSeries.setData(candles.map(candleData));
			volumeSeries.setData(
				candles.map((candle) => volumeData(candle, colors.volumeUp, colors.volumeDown)),
			);
			applyChartRange(chart, candles, range);
		}
		previousCandlesRef.current = candles;
	}, [candles, range]);

	useEffect(() => {
		volumeSeriesRef.current?.applyOptions({ visible: showVolume });
	}, [showVolume]);

	useEffect(() => {
		const chart = chartRef.current;
		if (chart) applyChartRange(chart, candlesRef.current, range);
	}, [range]);

	useEffect(() => {
		chartRef.current?.timeScale().fitContent();
	}, [resetKey]);

	useEffect(() => {
		chartRef.current?.timeScale().scrollToRealTime();
	}, [goLiveKey]);

	return <div ref={containerRef} className="absolute inset-0" />;
}
