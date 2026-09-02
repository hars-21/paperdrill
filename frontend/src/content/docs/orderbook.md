# Order book

`GET /markets/:symbol/orderbook` returns the current aggregated order book for a market. Authentication is not required.

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
  "timestamp": 1788350400000
}
```

Each level contains the total remaining quantity at that price. Bids are sorted from highest to lowest price, and asks from lowest to highest. Prices and quantities are decimal strings; `timestamp` is Unix milliseconds.

## Maintain a live book

The REST response is a snapshot. Live depth messages contain only the price level that changed, not the complete book.

To avoid missing an update while loading the snapshot:

1. Subscribe to `depth:SYMBOL` over [WebSocket](/docs/websocket).
2. Buffer incoming depth messages.
3. Request the REST snapshot.
4. Discard buffered messages whose `lastUpdateId` is not greater than the snapshot value.
5. Apply the remaining messages in order, followed by new live messages.

Set the level to the received `qty`. Remove it from the local book when `qty` is zero.

```json
{
  "event": "depth",
  "symbol": "SOL_USD",
  "bids": [{ "price": "125.40", "qty": "0.00" }],
  "asks": [],
  "lastUpdateId": 1843,
  "timestamp": 1788350400100
}
```
