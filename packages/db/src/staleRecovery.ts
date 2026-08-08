import type { PrismaClient } from "./generated/prisma/client.js";

type StaleRecoveryDb = Pick<PrismaClient, "$executeRaw">;

// El diseño de Fase 1 (heartbeat + reintentos en ScanJob) asume un worker
// persistente que sondea la cola (apps/worker). En producción no hay tal
// proceso: cada scan se procesa dentro de la misma request que lo crea, en
// after() (ver apps/web/app/api/scans/route.ts). Si esa request se corta a
// mitad de camino — Vercel mata la función al superar maxDuration=60, o el
// proceso muere sin más — el catch de runWorkerOnce() nunca llega a
// ejecutarse: la Evaluation se queda "running" y su ScanJob "locked" para
// siempre. Como el límite de concurrencia es 1 escaneo activo por IP, eso
// bloquea a esa IP de escanear nada más de forma permanente. Ya ocurrió una
// vez de verdad (ver CLAUDE.md) y no había ningún mecanismo automático de
// recuperación, solo limpieza manual en la base de datos.
//
// No reintenta el job (a diferencia de releaseStaleScanJobs, pensado para
// el poll loop de apps/worker) — falla la Evaluation directamente, porque
// en este despliegue nada vuelve a reclamar un job desbloqueado de forma
// oportuna salvo, por casualidad, una request de otra IP completamente
// distinta que dispare el siguiente tick.
export async function reapStaleEvaluations(db: StaleRecoveryDb, staleAfterMs: number): Promise<void> {
  await db.$executeRaw`
    UPDATE "evaluations" e
    SET status = 'failed', "completedAt" = now()
    WHERE e.status IN ('queued', 'running')
      AND EXISTS (
        SELECT 1 FROM "scan_jobs" j
        WHERE j."evaluationId" = e.id
          AND j."lockedAt" IS NOT NULL
          AND j."finishedAt" IS NULL
          AND j."heartbeatAt" < now() - (${staleAfterMs}::double precision * interval '1 millisecond')
      )
  `;
  await db.$executeRaw`
    UPDATE "scan_jobs" j
    SET "finishedAt" = now(), "lastError" = 'reaped: stale lock, worker likely killed mid-run'
    WHERE j."lockedAt" IS NOT NULL
      AND j."finishedAt" IS NULL
      AND j."heartbeatAt" < now() - (${staleAfterMs}::double precision * interval '1 millisecond')
  `;
}
