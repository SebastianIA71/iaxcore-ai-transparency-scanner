import type { EvidenceConfidenceBand, Finding } from "@iaxcore/core";

// Compartido entre t1Detector.ts y t2Detector.ts — mismo constructor de
// Finding, evita que cada detector reinvente el spread condicional de
// assessmentStatus (solo t1.assessment lo lleva; T2 nunca, §5.2).
export function buildFinding(
  evaluationId: string,
  detectorId: Finding["detectorId"],
  observationStatus: Finding["observationStatus"],
  confidenceBand: EvidenceConfidenceBand,
  summaryKey: string,
  detail: Record<string, unknown>,
  assessmentStatus?: Finding["assessmentStatus"],
): Finding {
  return {
    evaluationId,
    detectorId,
    observationStatus,
    confidenceBand,
    summaryKey,
    detail,
    ...(assessmentStatus ? { assessmentStatus } : {}),
  };
}
