-- CreateTable
CREATE TABLE "Position" (
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "qty" BIGINT NOT NULL,
    "costBasis" BIGINT NOT NULL,
    "realizedPnl" BIGINT NOT NULL DEFAULT 0,
    "lastBuyPrice" BIGINT,
    "lastBuyQty" BIGINT,
    "lastBuyAt" TIMESTAMP(3),
    "lastSellPrice" BIGINT,
    "lastSellQty" BIGINT,
    "lastSellAt" TIMESTAMP(3),
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("userId","asset")
);

-- CreateTable
CREATE TABLE "PositionEvent" (
    "id" TEXT NOT NULL,
    "fillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "qty" BIGINT NOT NULL,
    "quoteAmount" BIGINT NOT NULL,
    "costBasisBefore" BIGINT NOT NULL,
    "costBasisAfter" BIGINT NOT NULL,
    "realizedPnl" BIGINT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "quoteAsset" TEXT NOT NULL,
    "cash" BIGINT NOT NULL,
    "positionsValue" BIGINT NOT NULL,
    "equity" BIGINT NOT NULL,
    "realizedPnl" BIGINT NOT NULL,
    "unrealizedPnl" BIGINT NOT NULL,
    "netContributions" BIGINT NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_asset_idx" ON "Position"("asset");

-- CreateIndex
CREATE INDEX "PositionEvent_userId_asset_occurredAt_idx" ON "PositionEvent"("userId", "asset", "occurredAt");

-- CreateIndex
CREATE INDEX "PositionEvent_userId_occurredAt_idx" ON "PositionEvent"("userId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PositionEvent_fillId_userId_key" ON "PositionEvent"("fillId", "userId");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_at_idx" ON "PortfolioSnapshot"("userId", "at");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_at_idx" ON "PortfolioSnapshot"("at");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionEvent" ADD CONSTRAINT "PositionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
