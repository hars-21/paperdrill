-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "baseline" BIGINT NOT NULL,
    "equity" BIGINT NOT NULL,
    "pnl" BIGINT NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LeaderboardState" (
    "id" INTEGER NOT NULL,
    "quoteAsset" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_position_key" ON "LeaderboardEntry"("position");

-- CreateIndex
CREATE INDEX "Fill_buyerId_idx" ON "Fill"("buyerId");

-- CreateIndex
CREATE INDEX "Fill_sellerId_idx" ON "Fill"("sellerId");

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
