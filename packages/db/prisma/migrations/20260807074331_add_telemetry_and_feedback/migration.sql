-- §10-Fase 7: "telemetría" y "feedback estructurado". TelemetryEvent has no
-- FK to evaluations on purpose (see the model's comment in schema.prisma) —
-- an event referencing an invalid evaluationId is still worth recording.
CREATE TABLE "telemetry_events" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "evaluationId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telemetry_events_kind_createdAt_idx" ON "telemetry_events"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_evaluationId_idx" ON "feedback"("evaluationId");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
