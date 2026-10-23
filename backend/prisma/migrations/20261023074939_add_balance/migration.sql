-- CreateTable
CREATE TABLE "Balance" (
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "available" BIGINT NOT NULL,
    "locked" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("userId","asset")
);

-- CreateTable
CREATE TABLE "BalanceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "available" BIGINT NOT NULL,
    "locked" BIGINT NOT NULL,
    "deltaAvailable" BIGINT NOT NULL,
    "deltaLocked" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "symbol" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BalanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Balance_asset_idx" ON "Balance"("asset");

-- CreateIndex
CREATE INDEX "BalanceHistory_userId_asset_occurredAt_idx" ON "BalanceHistory"("userId", "asset", "occurredAt");

-- CreateIndex
CREATE INDEX "BalanceHistory_referenceId_idx" ON "BalanceHistory"("referenceId");

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
