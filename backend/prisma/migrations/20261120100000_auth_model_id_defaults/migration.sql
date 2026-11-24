-- Ensure Better Auth models have UUID defaults when ids are omitted
ALTER TABLE "Session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
