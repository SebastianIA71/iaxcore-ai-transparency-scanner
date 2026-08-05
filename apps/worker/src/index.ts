import { createHash } from "node:crypto";
import { canonicalizeForSigning, signCanonicalJson } from "@iaxcore/core";
import {
  claimNextScanJob,
  completeEvaluation,
  createReportArtifact,
  failEvaluation,
  finishScanJob,
  markEvaluationRunning,
  releaseScanJobAfterFailure,
  type PrismaClient,
} from "@iaxcore/db";

export interface WorkerConfig {
  workerId: string;
  signingKeyId: string;
  signingPrivateKeyBase64: string;
}

export interface WorkerRunResult {
  claimed: boolean;
  evaluationId?: string;
}

// §10-Fase 1: "demostrar que se pueden crear, ejecutar, guardar y verificar
// evaluaciones sin detectores funcionales" — T1/T2 no existen todavía (Fase
// 3/5), así que el worker completa con findings vacíos. Lo que prueba este
// pipeline es claim → running → firmar → completed → job finished, no la
// detección en sí.
export async function runWorkerOnce(db: PrismaClient, config: WorkerConfig): Promise<WorkerRunResult> {
  const job = await claimNextScanJob(db, config.workerId);
  if (!job) {
    return { claimed: false };
  }

  try {
    await markEvaluationRunning(db, job.evaluationId);
    const evaluation = await db.evaluation.findUniqueOrThrow({ where: { id: job.evaluationId } });

    const canonicalReport = {
      evaluationId: evaluation.id,
      requestedUrl: evaluation.requestedUrl,
      methodVersion: evaluation.methodVersion,
      findings: [] as unknown[],
    };
    const canonicalJson = canonicalizeForSigning(canonicalReport);
    const canonicalHash = `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
    const signature = signCanonicalJson(config.signingPrivateKeyBase64, canonicalReport);

    await createReportArtifact(db, {
      evaluationId: evaluation.id,
      format: "json",
      canonicalHash,
      signature,
      keyId: config.signingKeyId,
    });

    await completeEvaluation(db, evaluation.id, {
      finalUrl: evaluation.requestedUrl,
      pagesAnalyzed: 0,
      manifest: evaluation.manifest ?? {},
      reportHash: canonicalHash,
      signatureId: config.signingKeyId,
    });

    await finishScanJob(db, job.id);
    return { claimed: true, evaluationId: evaluation.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await releaseScanJobAfterFailure(db, job.id, message);
    await failEvaluation(db, job.evaluationId).catch(() => {
      // La evaluación puede ya no estar en queued/running (carrera con otro
      // worker) — no es un error nuevo que reportar, el original ya se relanza.
    });
    throw error;
  }
}
