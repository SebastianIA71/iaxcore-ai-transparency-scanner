import { createHash } from "node:crypto";
import { canonicalizeForSigning, signCanonicalJson } from "@iaxcore/core";
import {
  claimNextScanJob,
  completeEvaluation,
  createFindings,
  createReportArtifact,
  failEvaluation,
  finishScanJob,
  markEvaluationRunning,
  releaseScanJobAfterFailure,
  type PrismaClient,
} from "@iaxcore/db";
import { t1Detector, t2Detector } from "@iaxcore/detectors";
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

// Extraída de apps/worker a un paquete compartido porque dos consumidores
// distintos necesitan exactamente esta misma secuencia claim → scan → T1 →
// firmar → completar: el poll loop persistente de apps/worker (src/main.ts)
// y, ahora, apps/web disparándola en línea dentro de POST /api/scans (Vercel
// Hobby no soporta cron con la frecuencia que haría falta para un worker por
// cola — ver el `after()` en apps/web/app/api/scans/route.ts).
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

    // §10-Fase 3/5: T1 y T2 navegan cada uno de forma independiente a
    // scan.finalUrl (no reutilizan la página de runScan() — ver el
    // comentario en t1Detector.ts sobre por qué el contrato Detector no
    // puede llevar una Page). T2 es informativo/no bloqueante (§5.2) — sus
    // findings nunca llevan assessmentStatus, así que no afectan el
    // veredicto de T1, solo se añaden al mismo informe.
    const [t1Result, t2Result] = await Promise.all([
      t1Detector.run({ evaluationId: evaluation.id, finalUrl: scan.finalUrl }),
      t2Detector.run({ evaluationId: evaluation.id, finalUrl: scan.finalUrl }),
    ]);
    const allFindings = [...t1Result.findings, ...t2Result.findings];
    if (allFindings.length > 0) {
      await createFindings(
        db,
        allFindings.map((f) => ({
          evaluationId: f.evaluationId,
          detectorId: f.detectorId,
          observationStatus: f.observationStatus,
          assessmentStatus: f.assessmentStatus,
          confidenceBand: f.confidenceBand,
          summaryKey: f.summaryKey,
          // Finding.detail (packages/core) es Record<string, unknown>; el
          // round-trip evita el mismo desajuste de tipos que scan.manifest
          // más abajo, sin reabrir los tipos generados de Prisma aquí.
          detail: JSON.parse(JSON.stringify(f.detail)),
        })),
      );
    }

    const canonicalReport = {
      evaluationId: evaluation.id,
      requestedUrl: evaluation.requestedUrl,
      methodVersion: evaluation.methodVersion,
      findings: allFindings.map((f) => ({
        detectorId: f.detectorId,
        observationStatus: f.observationStatus,
        assessmentStatus: f.assessmentStatus,
        confidenceBand: f.confidenceBand,
        summaryKey: f.summaryKey,
        detail: f.detail,
      })),
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
