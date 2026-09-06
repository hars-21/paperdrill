import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UserBalance } from "@/types";

type UseBalanceOptions = {
	asset?: string;
	enabled?: boolean;
};

export function useBalance({ asset, enabled = true }: UseBalanceOptions = {}) {
	const [balances, setBalances] = useState<UserBalance>({});
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<Error | null>(null);
	const [refreshCount, setRefreshCount] = useState(0);

	const refresh = useCallback(() => {
		setRefreshCount((count) => count + 1);
	}, []);

	useEffect(() => {
		if (!enabled) {
			setBalances({});
			setError(null);
			setLoading(false);
			return;
		}

		let active = true;
		setLoading(true);
		setError(null);

		api
			.getBalance(asset)
			.then((data) => {
				if (active) setBalances(data);
			})
			.catch((cause) => {
				if (!active) return;
				setError(cause instanceof Error ? cause : new Error("Failed to load balances"));
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [asset, enabled, refreshCount]);

	return { balances, loading, error, refresh };
}
