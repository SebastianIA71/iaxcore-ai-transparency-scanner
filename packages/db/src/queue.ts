import type { PrismaClient } from "./generated/prisma/client.js";

type QueueDb = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

export interface ClaimedScanJob {
  id: string;
  evaluationId: string;
  attempts: number;
}

// §8/§10-Fase 1: "cola PostgreSQL con locks, heartbeat, reintentos y SKIP
// LOCKED — sin Redis." SKIP LOCKED es lo que deja a varios workers competir
// por la tabla sin bloquearse entre sí ni reclamar el mismo job dos veces;
// se verifica con concurrencia real en queue.integration.test.ts, no aquí.
export async function claimNextScanJob(db: QueueDb, workerId: string): Promise<ClaimedScanJob | null> {
  const rows = await db.$queryRaw<ClaimedScanJob[]>`
    UPDATE "scan_jobs"
    SET "lockedAt" = now(), "lockedBy" = ${workerId}, "heartbeatAt" = now(), "attempts" = "attempts" + 1
    WHERE id = (
      SELECT id FROM "scan_jobs"
      WHERE "lockedAt" IS NULL
        AND "availableAt" <= now()
        AND "attempts" < "maxAttempts"
      ORDER BY "availableAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, "evaluationId", attempts;
  `;
  return rows[0] ?? null;
}

export async function recordHeartbeat(db: QueueDb, jobId: string): Promise<void> {
  await db.$executeRaw`UPDATE "scan_jobs" SET "heartbeatAt" = now() WHERE id = ${jobId}`;
}

export async function finishScanJob(db: QueueDb, jobId: string): Promise<void> {
  await db.$executeRaw`UPDATE "scan_jobs" SET "finishedAt" = now() WHERE id = ${jobId}`;
}

// Libera el lock para reintento y guarda el error. Si ya alcanzó
// maxAttempts, el WHERE no matchea y el job se queda locked-out — quien
// orquesta el Evaluation debe llamar a failEvaluation() por separado.
export async function releaseScanJobAfterFailure(db: QueueDb, jobId: string, errorMessage: string): Promise<void> {
  await db.$executeRaw`
    UPDATE "scan_jobs"
    SET "lockedAt" = NULL, "lockedBy" = NULL, "lastError" = ${errorMessage}
    WHERE id = ${jobId} AND attempts < "maxAttempts"
  `;
}

// §10-Fase 1: "recuperación tras caída del worker" — si un worker muere sin
// liberar su lock, el heartbeat deja de avanzar; pasado staleAfterMs se
// considera abandonado y vuelve a quedar disponible para otro worker.
export async function releaseStaleScanJobs(db: QueueDb, staleAfterMs: number): Promise<void> {
  await db.$executeRaw`
    UPDATE "scan_jobs"
    SET "lockedAt" = NULL, "lockedBy" = NULL
    WHERE "lockedAt" IS NOT NULL
      AND "heartbeatAt" < now() - (${staleAfterMs}::double precision * interval '1 millisecond')
  `;
}
