-- CreateTable
CREATE TABLE "ProjectionCursor" (
    "name" TEXT NOT NULL,
    "lastEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectionCursor_pkey" PRIMARY KEY ("name")
);
