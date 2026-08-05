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
import { runScan } from "@iaxcore/scanner";

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

    // §10-Fase 2: navega de verdad (SSRF guard, robots.txt, selección de
    // páginas, banner de consentimiento) y produce el manifest que exige el
    // gate de esa fase. `evaluation.pagesRequested` ya es el tope acordado
    // en la creación (§9: "hasta cinco páginas"), no algo que el escaneo
    // decida — se lo pasamos como límite, no lo recalculamos aquí.
    const scan = await runScan(evaluation.requestedUrl, { maxPages: evaluation.pagesRequested });

    // El JSON firmado no incluye todavía manifest/páginas: T1/T2 (Fase
    // 3/5) son lo que da contenido real a `findings`, y no existen aún —
    // firmar de más ahora solo obligaría a re-firmar cuando lleguen.
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
      finalUrl: scan.finalUrl,
      pagesAnalyzed: scan.pagesAnalyzed,
      // scan.manifest is plain JSON data, but ScanManifest's typed shape
      // (and its `unknown`-valued catchall) doesn't structurally match
      // Prisma's InputJsonValue — round-trip it rather than reaching into
      // @iaxcore/db's generated Prisma types just for a cast.
      manifest: JSON.parse(JSON.stringify(scan.manifest)),
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
