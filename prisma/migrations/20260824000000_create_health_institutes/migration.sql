-- CreateEnum
CREATE TYPE "InstituteStatus" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE');

-- CreateTable
CREATE TABLE "health_institutes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "status" "InstituteStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_institutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_institutes_name_idx" ON "health_institutes"("name");

-- CreateIndex
CREATE INDEX "health_institutes_city_idx" ON "health_institutes"("city");

-- CreateIndex
CREATE INDEX "health_institutes_status_idx" ON "health_institutes"("status");