-- TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- CreateTable
CREATE TABLE "Candle" (
    "symbol" TEXT NOT NULL,
    "open" BIGINT NOT NULL,
    "high" BIGINT NOT NULL,
    "low" BIGINT NOT NULL,
    "close" BIGINT NOT NULL,
    "volume" BIGINT NOT NULL,
    "time" TIMESTAMPTZ NOT NULL
);

-- CreateIndex
CREATE INDEX "Candle_time_idx" ON "Candle"("time");

-- CreateIndex
CREATE UNIQUE INDEX "Candle_symbol_time_key" ON "Candle"("symbol", "time");

-- HyperTable
SELECT create_hypertable('"Candle"', 'time');

