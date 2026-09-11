-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateTable
CREATE TABLE "donation_rewards" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "healthInstituteId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 50,
    "status" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donation_rewards_donationId_key" ON "donation_rewards"("donationId");

-- CreateIndex
CREATE INDEX "donation_rewards_donorId_idx" ON "donation_rewards"("donorId");

-- CreateIndex
CREATE INDEX "donation_rewards_healthInstituteId_idx" ON "donation_rewards"("healthInstituteId");

-- CreateIndex
CREATE INDEX "donation_rewards_status_idx" ON "donation_rewards"("status");

-- AddForeignKey
ALTER TABLE "donation_rewards" ADD CONSTRAINT "donation_rewards_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_rewards" ADD CONSTRAINT "donation_rewards_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_rewards" ADD CONSTRAINT "donation_rewards_healthInstituteId_fkey" FOREIGN KEY ("healthInstituteId") REFERENCES "health_institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_rewards" ADD CONSTRAINT "donation_rewards_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
