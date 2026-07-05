/*
  Warnings:

  - Added the required column `baseAsset` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePrecision` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantityPrecision` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quoteAsset` to the `Market` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "baseAsset" TEXT NOT NULL,
ADD COLUMN     "pricePrecision" INTEGER NOT NULL,
ADD COLUMN     "quantityPrecision" INTEGER NOT NULL,
ADD COLUMN     "quoteAsset" TEXT NOT NULL;
