// IAXCORE AI Transparency Scanner — vocabulario cerrado (spec v0.5.2 §6).
// "warning" no existe en ningún vocabulario del sistema — si se añade aquí, es un bug.

export const OBSERVATION_STATUSES = [
  "detected",
  "not_detected",
  "partially_detected",
  "not_assessable",
  "error",
] as const;
export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number];

export const ASSESSMENT_STATUSES = [
  "aligned",
  "action_recommended",
  "not_applicable",
  "insufficient_evidence",
  "experimental",
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const EVIDENCE_CONFIDENCE_BANDS = ["high", "medium", "low"] as const;
export type EvidenceConfidenceBand = (typeof EVIDENCE_CONFIDENCE_BANDS)[number];

export const DETECTOR_COMPLETENESS_STATES = ["complete", "partial", "unavailable"] as const;
export type DetectorCompleteness = (typeof DETECTOR_COMPLETENESS_STATES)[number];

// §4: "test automático de copy debe fallar el build si aparecen".
// Incluye "warning" porque tampoco puede aparecer como palabra en el copy visible.
export const FORBIDDEN_COPY_WORDS = [
  "compliant",
  "certified",
  "secure",
  "guaranteed",
  "cumple",
  "incumple",
  "certificado",
  "seguro",
  "garantizado",
  "warning",
] as const;

// §4: nunca este texto, cualquiera que sea el idioma o el finding.
export const FORBIDDEN_ACTION_RECOMMENDED_PHRASES_ES = ["falta un aviso obligatorio"] as const;
export const FORBIDDEN_ACTION_RECOMMENDED_PHRASES_EN = ["a mandatory notice is missing"] as const;
