import type { CandleInterval } from "@/hooks/use-candles";
import type { ChartStyle } from "@/components/chart/chart-utils";

const STORAGE_KEY = "paperdrill:ux-preferences:v1";
export const DEFAULT_TRADE_SYMBOL = "BTC_USD";

const CANDLE_INTERVALS = new Set<CandleInterval>([
	"1m",
	"5m",
	"15m",
	"30m",
	"1H",
	"4H",
	"1D",
]);
const CHART_STYLES = new Set<ChartStyle>(["candlestick", "line", "area"]);
const MARKET_SYMBOL_PATTERN = /^[A-Z0-9]{2,12}_[A-Z0-9]{2,12}$/;

type StoredPreferences = {
	lastTradeSymbol?: string;
	chart?: Partial<ChartPreferences>;
};

export type ChartPreferences = {
	interval: CandleInterval;
	style: ChartStyle;
	showVolume: boolean;
};

const DEFAULT_CHART_PREFERENCES: ChartPreferences = {
	interval: "1H",
	style: "candlestick",
	showVolume: true,
};

let cachedPreferences: StoredPreferences | undefined;
let storageListenerAttached = false;
const preferenceListeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function attachStorageListener() {
	if (storageListenerAttached || typeof window === "undefined") return;
	window.addEventListener("storage", (event) => {
		if (event.key !== STORAGE_KEY) return;
		cachedPreferences = undefined;
		preferenceListeners.forEach((listener) => listener());
	});
	storageListenerAttached = true;
}

function readPreferences(): StoredPreferences {
	if (cachedPreferences) return cachedPreferences;
	attachStorageListener();
	if (typeof window === "undefined") return {};

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return (cachedPreferences = {});
		const parsed: unknown = JSON.parse(raw);
		return (cachedPreferences = isRecord(parsed) ? parsed : {});
	} catch {
		return (cachedPreferences = {});
	}
}

function writePreferences(preferences: StoredPreferences) {
	cachedPreferences = preferences;
	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
		} catch {
			// Preferences are optional when browser storage is unavailable.
		}
	}
	preferenceListeners.forEach((listener) => listener());
}

function isMarketSymbol(value: unknown): value is string {
	return typeof value === "string" && MARKET_SYMBOL_PATTERN.test(value);
}

export function getLastTradeSymbol() {
	const symbol = readPreferences().lastTradeSymbol;
	return isMarketSymbol(symbol) ? symbol : DEFAULT_TRADE_SYMBOL;
}

export function getLastTradePath() {
	return `/trade/${getLastTradeSymbol()}`;
}

export function subscribeToPreferences(listener: () => void) {
	attachStorageListener();
	preferenceListeners.add(listener);
	return () => preferenceListeners.delete(listener);
}

export function saveLastTradeSymbol(symbol: string) {
	const normalizedSymbol = symbol.trim().toUpperCase();
	if (!isMarketSymbol(normalizedSymbol)) return;
	const currentPreferences = readPreferences();
	if (currentPreferences.lastTradeSymbol === normalizedSymbol) return;

	writePreferences({
		...currentPreferences,
		lastTradeSymbol: normalizedSymbol,
	});
}

export function getChartPreferences(): ChartPreferences {
	const chart = readPreferences().chart;
	return {
		interval:
			typeof chart?.interval === "string" && CANDLE_INTERVALS.has(chart.interval)
				? chart.interval
				: DEFAULT_CHART_PREFERENCES.interval,
		style:
			typeof chart?.style === "string" && CHART_STYLES.has(chart.style)
				? chart.style
				: DEFAULT_CHART_PREFERENCES.style,
		showVolume:
			typeof chart?.showVolume === "boolean"
				? chart.showVolume
				: DEFAULT_CHART_PREFERENCES.showVolume,
	};
}

export function saveChartPreferences(preferences: Partial<ChartPreferences>) {
	writePreferences({
		...readPreferences(),
		chart: {
			...getChartPreferences(),
			...preferences,
		},
	});
}
