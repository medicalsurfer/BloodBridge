-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'TEMPORARILY_DEFERRED', 'MEDICAL_REVIEW');

-- CreateTable
CREATE TABLE "eligibility_assessments" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "status" "EligibilityStatus" NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "reasons" TEXT[],
    "answers" JSONB NOT NULL,
    "daysRemaining" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eligibility_assessments_donorId_createdAt_idx" ON "eligibility_assessments"("donorId", "createdAt");

-- AddForeignKey
ALTER TABLE "eligibility_assessments" ADD CONSTRAINT "eligibility_assessments_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
