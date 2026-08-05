import { z } from "zod";
import { ASSESSMENT_STATUSES, EVIDENCE_CONFIDENCE_BANDS, OBSERVATION_STATUSES } from "./vocabulary.js";

// §15 nombra los tres sub-findings de T1 y el finding agregado t1.assessment,
// más T2 (§5.2) y el contrato T3 (§5.3, solo interfaz). Los ids de T2/T3 no
// están fijados literalmente en la spec; siguen la convención "<control>.<detector>".
export const detectorIdSchema = z.enum([
  "t1.channel",
  "t1.ai_evidence",
  "t1.disclosure",
  "t1.assessment",
  "t2.visible_labelling",
  "t3.provenance",
]);
export type DetectorId = z.infer<typeof detectorIdSchema>;

export const findingSchema = z.object({
  evaluationId: z.string(),
  detectorId: detectorIdSchema,
  observationStatus: z.enum(OBSERVATION_STATUSES),
  // Solo presente en el finding agregado t1.assessment (§5.1, §15): los tres
  // sub-findings tienen observationStatus pero no assessmentStatus propio.
  assessmentStatus: z.enum(ASSESSMENT_STATUSES).optional(),
  confidenceBand: z.enum(EVIDENCE_CONFIDENCE_BANDS),
  summaryKey: z.string(),
  detail: z.record(z.string(), z.unknown()),
});
export type Finding = z.infer<typeof findingSchema>;

export const evidenceSchema = z.object({
  findingId: z.string(),
  kind: z.string(),
  location: z.string(),
  observedAt: z.iso.datetime(),
  contentHash: z.string(),
  // §9: purgable a 90 días; solo uno de los dos suele estar presente tras la purga.
  storagePath: z.string().optional(),
  payload: z.unknown().optional(),
  method: z.string(),
  origin: z.string(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

// §7/§10-Fase 1: "queued → running → completed" es el ciclo feliz descrito en
// la spec; "failed" no está nombrado literalmente pero es necesario para
// ScanJob.lastError/maxAttempts — inferencia de ingeniería, no una decisión de
// producto nueva.
export const evaluationStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;

export const evaluationManifestSchema = z
  .object({
    consent_interaction: z.enum(["accepted_banner", "not_detected", "declined"]).optional(),
  })
  .catchall(z.unknown());

export const evaluationSchema = z.object({
  id: z.string(),
  requestedUrl: z.url(),
  finalUrl: z.url().optional(),
  status: evaluationStatusSchema,
  methodVersion: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  pagesRequested: z.number().int().nonnegative(),
  pagesAnalyzed: z.number().int().nonnegative(),
  manifest: evaluationManifestSchema,
  reportHash: z.string().optional(),
  signatureId: z.string().optional(),
});
export type Evaluation = z.infer<typeof evaluationSchema>;

export const scanJobSchema = z.object({
  evaluationId: z.string(),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  availableAt: z.iso.datetime(),
  lockedAt: z.iso.datetime().optional(),
  lockedBy: z.string().optional(),
  heartbeatAt: z.iso.datetime().optional(),
  lastError: z.string().optional(),
  finishedAt: z.iso.datetime().optional(),
});
export type ScanJob = z.infer<typeof scanJobSchema>;

export const reportArtifactSchema = z.object({
  evaluationId: z.string(),
  format: z.enum(["json", "pdf"]),
  canonicalHash: z.string(),
  // §8: "El PDF no lleva firma propia" — signature/keyId solo aplican a format "json".
  signature: z.string().optional(),
  keyId: z.string().optional(),
  createdAt: z.iso.datetime(),
});
export type ReportArtifact = z.infer<typeof reportArtifactSchema>;

export const shareLinkSchema = z.object({
  reportArtifactId: z.string(),
  tokenHash: z.string(),
  expiresAt: z.iso.datetime(),
  revokedAt: z.iso.datetime().optional(),
  lastAccessedAt: z.iso.datetime().optional(),
});
export type ShareLink = z.infer<typeof shareLinkSchema>;

export const leadSchema = z.object({
  email: z.email(),
  evaluationId: z.string(),
  consent: z.record(z.string(), z.unknown()),
  priceInterestClicked: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Lead = z.infer<typeof leadSchema>;
