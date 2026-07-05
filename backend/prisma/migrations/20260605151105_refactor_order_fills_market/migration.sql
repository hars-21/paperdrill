/*
  Warnings:

  - You are about to drop the column `asset` on the `Fill` table. All the data in the column will be lost.
  - You are about to drop the column `originalOrderId` on the `Fill` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Fill` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Fill` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `Fill` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `qty` on the `Fill` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to drop the column `market` on the `Order` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `qty` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to alter the column `filledQty` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `BigInt`.
  - You are about to drop the `Stock` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `buyOrderId` to the `Fill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyerId` to the `Fill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellOrderId` to the `Fill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `Fill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `Fill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'PARTIALLY_FILLED';

-- DropForeignKey
ALTER TABLE "Fill" DROP CONSTRAINT "Fill_originalOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Fill" DROP CONSTRAINT "Fill_userId_fkey";

-- AlterTable
ALTER TABLE "Fill" DROP COLUMN "asset",
DROP COLUMN "originalOrderId",
DROP COLUMN "type",
DROP COLUMN "userId",
ADD COLUMN     "buyOrderId" TEXT NOT NULL,
ADD COLUMN     "buyerId" TEXT NOT NULL,
ADD COLUMN     "sellOrderId" TEXT NOT NULL,
ADD COLUMN     "sellerId" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT NOT NULL,
ALTER COLUMN "price" SET DATA TYPE BIGINT,
ALTER COLUMN "qty" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "market",
ADD COLUMN     "symbol" TEXT NOT NULL,
ALTER COLUMN "price" SET DATA TYPE BIGINT,
ALTER COLUMN "qty" SET DATA TYPE BIGINT,
ALTER COLUMN "filledQty" SET DATA TYPE BIGINT;

-- DropTable
DROP TABLE "Stock";

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_symbol_key" ON "Market"("symbol");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;
