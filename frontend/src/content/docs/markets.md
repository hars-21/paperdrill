# Markets

Market endpoints are public. They do not require an API key.

## List markets

`GET /markets` returns the available spot markets and the precision accepted for their price and quantity fields.

```bash
curl https://api.paperdrill.dev/v1/markets
```

```json
{
  "data": [
    {
      "id": "d4e15a52-dc8e-49b0-83d7-46f19d178c55",
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

`pricePrecision` and `qtyPrecision` are the maximum decimal places accepted when creating orders. Market symbols use an underscore, such as `SOL_USD`.

## Get all tickers

`GET /markets/tickers` returns the latest 24-hour ticker for every market that has trade data.

```bash
curl https://api.paperdrill.dev/v1/markets/tickers
```

The response is an array of ticker objects. A ticker can be absent until its market has recorded a trade.

## Get one ticker

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
  "quoteVolume": "42540.7500",
  "priceChange": "+3.40",
  "priceChangePercent": 2.78,
  "timestamp": "2026-09-02T12:00:00.000Z"
}
```

Prices and volumes are decimal strings. `priceChangePercent` is a JSON number, and `timestamp` is an ISO 8601 string. The endpoint returns `404` when ticker data is not available yet.
