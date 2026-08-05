-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('detected', 'not_detected', 'partially_detected', 'not_assessable', 'error');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('aligned', 'action_recommended', 'not_applicable', 'insufficient_evidence', 'experimental');

-- CreateEnum
CREATE TYPE "EvidenceConfidenceBand" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "requestedUrl" TEXT NOT NULL,
    "finalUrl" TEXT,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'queued',
    "methodVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "pagesRequested" INTEGER NOT NULL,
    "pagesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "manifest" JSONB NOT NULL DEFAULT '{}',
    "reportHash" TEXT,
    "signatureId" TEXT,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_jobs" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "heartbeatAt" TIMESTAMP(3),
    "lastError" TEXT,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "scan_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "detectorId" TEXT NOT NULL,
    "observationStatus" "ObservationStatus" NOT NULL,
    "assessmentStatus" "AssessmentStatus",
    "confidenceBand" "EvidenceConfidenceBand" NOT NULL,
    "summaryKey" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storagePath" TEXT,
    "payload" JSONB,
    "method" TEXT NOT NULL,
    "origin" TEXT NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_artifacts" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "signature" TEXT,
    "keyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "reportArtifactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "consent" JSONB NOT NULL DEFAULT '{}',
    "priceInterestClicked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_jobs_evaluationId_key" ON "scan_jobs"("evaluationId");

-- CreateIndex
CREATE INDEX "scan_jobs_lockedAt_availableAt_idx" ON "scan_jobs"("lockedAt", "availableAt");

-- CreateIndex
CREATE INDEX "findings_evaluationId_detectorId_idx" ON "findings"("evaluationId", "detectorId");

-- CreateIndex
CREATE INDEX "evidence_findingId_idx" ON "evidence"("findingId");

-- CreateIndex
CREATE INDEX "report_artifacts_evaluationId_idx" ON "report_artifacts"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_tokenHash_key" ON "share_links"("tokenHash");

-- CreateIndex
CREATE INDEX "leads_evaluationId_idx" ON "leads"("evaluationId");

-- AddForeignKey
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_reportArtifactId_fkey" FOREIGN KEY ("reportArtifactId") REFERENCES "report_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
