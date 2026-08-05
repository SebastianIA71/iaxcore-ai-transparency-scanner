-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN "requesterIpHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "evaluations_requesterIpHash_createdAt_idx" ON "evaluations"("requesterIpHash", "createdAt");

-- CreateIndex
CREATE INDEX "evaluations_requesterIpHash_status_idx" ON "evaluations"("requesterIpHash", "status");
