ALTER TABLE "users" ADD COLUMN "healthInstituteId" TEXT;

CREATE INDEX "users_healthInstituteId_idx" ON "users"("healthInstituteId");

ALTER TABLE "users"
ADD CONSTRAINT "users_healthInstituteId_fkey"
FOREIGN KEY ("healthInstituteId") REFERENCES "health_institutes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;