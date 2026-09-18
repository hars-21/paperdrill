-- CreateEnum
CREATE TYPE "DailyCreditStatus" AS ENUM ('PENDING', 'APPLIED');

-- CreateTable
CREATE TABLE "DailyCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditDate" DATE NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "DailyCreditStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "DailyCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCredit_status_createdAt_idx" ON "DailyCredit"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCredit_userId_creditDate_key" ON "DailyCredit"("userId", "creditDate");

-- AddForeignKey
ALTER TABLE "DailyCredit" ADD CONSTRAINT "DailyCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
