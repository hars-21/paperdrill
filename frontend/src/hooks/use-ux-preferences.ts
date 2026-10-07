import { useSyncExternalStore } from "react";
import {
	DEFAULT_TRADE_SYMBOL,
	getLastTradePath,
	subscribeToPreferences,
} from "@/lib/ux-preferences";

const DEFAULT_TRADE_PATH = `/trade/${DEFAULT_TRADE_SYMBOL}`;

export function useLastTradePath() {
	return useSyncExternalStore(subscribeToPreferences, getLastTradePath, () => DEFAULT_TRADE_PATH);
}
