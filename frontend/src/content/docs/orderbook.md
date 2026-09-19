# Order book

`GET /markets/:symbol/orderbook` returns an aggregated depth snapshot. Authentication is not required.

```bash
curl https://api.paperdrill.dev/v1/markets/SOL_USD/orderbook
```

```json
{
	"symbol": "SOL_USD",
	"bids": [
		{ "price": "125.40", "qty": "8.50" },
		{ "price": "125.20", "qty": "4.00" }
	],
	"asks": [
		{ "price": "125.60", "qty": "3.25" },
		{ "price": "125.80", "qty": "6.00" }
	],
	"lastUpdateId": 1842,
	"timestamp": 1789812000000
}
```

Bids are highest price first; asks are lowest price first. Each level is the total remaining quantity at that price. `timestamp` is Unix milliseconds.

## Maintain a live local book

REST gives a snapshot. The `depth:SYMBOL` WebSocket stream gives only levels that changed. To prevent a race while loading:

1. Subscribe to `depth:SYMBOL` and buffer messages.
2. Fetch the REST snapshot.
3. Discard buffered messages with `lastUpdateId` less than or equal to the snapshot value.
4. Apply the remaining messages in order, then apply new messages immediately.

Set a local level to the received `qty`. Remove it when `qty` is `"0.00"`.

```json
{
	"event": "depth",
	"symbol": "SOL_USD",
	"bids": [{ "price": "125.40", "qty": "0.00" }],
	"asks": [],
	"lastUpdateId": 1843,
	"timestamp": 1789812000100
}
```
