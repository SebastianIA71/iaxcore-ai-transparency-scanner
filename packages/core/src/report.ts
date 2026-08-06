import type { Finding } from "./entities.js";

export interface CanonicalReportInput {
  evaluationId: string;
  requestedUrl: string;
  methodVersion: string;
  findings: Finding[];
}

export interface CanonicalReportFinding {
  detectorId: string;
  observationStatus: string;
  assessmentStatus?: string;
  confidenceBand: string;
  summaryKey: string;
  detail: Record<string, unknown>;
}

export interface CanonicalReport {
  evaluationId: string;
  requestedUrl: string;
  methodVersion: string;
  findings: CanonicalReportFinding[];
}

// §8/§19: la forma exacta del objeto que se firma (Ed25519, sobre
// canonicalizeForSigning() de este mismo objeto). Vive aquí, no en
// packages/pipeline, porque dos consumidores necesitan producir el objeto
// BYTE A BYTE idéntico: quien firma (packages/pipeline, al completar un
// escaneo) y quien verifica (apps/web's /verify, reconstruyéndolo desde lo
// que hay en Postgres) — cualquier diferencia entre ambos, por mínima que
// sea, invalidaría toda firma existente. `evaluationId`/`id`/`createdAt` de
// cada Finding se omiten deliberadamente: el payload firmado es derivable
// del propio resultado de los detectores, no de un round-trip a la BD.
export function buildCanonicalReport(input: CanonicalReportInput): CanonicalReport {
  return {
    evaluationId: input.evaluationId,
    requestedUrl: input.requestedUrl,
    methodVersion: input.methodVersion,
    findings: input.findings.map((f) => ({
      detectorId: f.detectorId,
      observationStatus: f.observationStatus,
      assessmentStatus: f.assessmentStatus,
      confidenceBand: f.confidenceBand,
      summaryKey: f.summaryKey,
      detail: f.detail,
    })),
  };
}
