import { BALANCES } from "../store";

export async function getAllBalancesHandler() {
	return Object.fromEntries(
		Object.entries(BALANCES).map(([userId, balances]) => [
			userId,
			Object.fromEntries(
				Object.entries(balances).map(([asset, balance]) => [asset, { ...balance }]),
			),
		]),
	);
}
