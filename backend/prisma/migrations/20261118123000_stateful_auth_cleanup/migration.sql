-- Drop legacy auth artifacts
ALTER TABLE "User" DROP COLUMN "password";
DROP TABLE "VerificationToken";

-- Onboarding
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Explicit credit claims (starter, future daily/referrals)
CREATE TYPE "CreditClaimKind" AS ENUM ('STARTER', 'DAILY');

CREATE TABLE "CreditClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CreditClaimKind" NOT NULL,
    "periodKey" TEXT NOT NULL DEFAULT '',
    "asset" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditClaim_userId_createdAt_idx" ON "CreditClaim"("userId", "createdAt");
CREATE UNIQUE INDEX "CreditClaim_userId_kind_periodKey_key" ON "CreditClaim"("userId", "kind", "periodKey");

ALTER TABLE "CreditClaim" ADD CONSTRAINT "CreditClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
