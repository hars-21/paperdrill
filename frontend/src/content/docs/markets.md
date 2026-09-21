# Markets and candles

Market endpoints are public. Values representing price, quantity, or volume are decimal strings.

## List markets

`GET /markets` returns every tradable market and its precision rules.

```bash
curl https://api.paperdrill.dev/v1/markets
```

```json
{
	"data": [
		{
			"id": "market_123",
			"name": "Solana",
			"symbol": "SOL_USD",
			"baseAsset": "SOL",
			"quoteAsset": "USD",
			"pricePrecision": 2,
			"qtyPrecision": 2
		}
	]
}
```

Use the underscore form (`SOL_USD`) in all API paths and requests.

## Tickers

`GET /markets/tickers` returns an array of current tickers. `GET /markets/:symbol/ticker` returns one.

```bash
curl https://api.paperdrill.dev/v1/markets/SOL_USD/ticker
```

```json
{
	"event": "ticker",
	"symbol": "SOL_USD",
	"lastPrice": "125.50",
	"openPrice": "122.10",
	"high": "128.00",
	"low": "120.25",
	"volume": "340.50",
	"quoteVolume": "42540.75",
	"priceChange": "+3.40",
	"priceChangePercent": 2.78,
	"timestamp": "2026-09-19T12:00:00.000Z"
}
```

Before the first trade, price and volume values can be `null`.

## Candles

`GET /markets/:symbol/candles?interval=15m` returns historical OHLCV candles in chronological order.

Supported intervals: `1m`, `5m`, `15m`, `30m`, `1H`, `4H`, and `1D`. The default is `15m`.

```bash
curl "https://api.paperdrill.dev/v1/markets/SOL_USD/candles?interval=1H"
```

```json
{
	"data": [
		{
			"time": 1789812000000,
			"symbol": "SOL_USD",
			"open": "125.00",
			"high": "126.00",
			"low": "124.50",
			"close": "125.50",
			"volume": "20.00"
		}
	]
}
```

For live ticker and candle updates, use [WebSocket](/docs/websocket).
