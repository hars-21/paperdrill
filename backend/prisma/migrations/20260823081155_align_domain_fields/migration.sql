/*
  Warnings:

  - You are about to drop the column `side` on the `Fill` table. All the data in the column will be lost.
  - You are about to drop the column `quantityPrecision` on the `Market` table. All the data in the column will be lost.
  - Added the required column `isBuyerMaker` to the `Fill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qtyPrecision` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spentAmount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LIMIT', 'MARKET');

-- DropForeignKey
ALTER TABLE "Fill" DROP CONSTRAINT "Fill_buyOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Fill" DROP CONSTRAINT "Fill_sellOrderId_fkey";

-- AlterTable
ALTER TABLE "Candle" ADD CONSTRAINT "Candle_pkey" PRIMARY KEY ("symbol", "time");

-- DropIndex
DROP INDEX "Candle_symbol_time_key";

-- AlterTable
ALTER TABLE "Fill" DROP COLUMN "side",
ADD COLUMN     "isBuyerMaker" BOOLEAN NOT NULL,
ALTER COLUMN "createdAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Market" DROP COLUMN "quantityPrecision",
ADD COLUMN     "qtyPrecision" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lockedAmount" BIGINT,
ADD COLUMN     "spentAmount" BIGINT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "OrderType" NOT NULL,
ALTER COLUMN "createdAt" DROP DEFAULT;

-- DropEnum
DROP TYPE "MarketType";
