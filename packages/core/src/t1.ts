import type { AssessmentStatus, ObservationStatus } from "./vocabulary.js";

export type T1ChannelObservationStatus = Extract<
  ObservationStatus,
  "detected" | "not_detected" | "not_assessable" | "error"
>;

export interface T1ChannelDetail {
  // v0.5.2 §5.1 (B5): un canal que deriva a una persona humana, o que es
  // exclusivamente máquina-a-máquina, cuenta como not_detected — no es una
  // dimensión de resultado nueva.
  human_intermediary_detected: boolean;
}

export interface T1ChannelFinding {
  observationStatus: T1ChannelObservationStatus;
  detail: T1ChannelDetail;
}

export type T1AiEvidenceObservationStatus = Extract<ObservationStatus, "detected" | "not_detected">;

export interface T1AiEvidenceDetail {
  evidence_of_human?: boolean;
}

export interface T1AiEvidenceFinding {
  observationStatus: T1AiEvidenceObservationStatus;
  detail: T1AiEvidenceDetail;
}

export type DisclosureTiming = "on_open" | "n/a";

// §5.1 — evidencia estructurada de la excepción de obviedad, capturada cuando
// context_exceptions_note es true. No decide si la excepción aplica; solo deja
// evidencia reproducible para revisión humana posterior.
export interface ObviousnessSignals {
  assistant_name_suggests_ai: boolean;
  assistant_avatar_type: "robot_icon" | "human_photo" | "abstract" | "none";
  simulates_human_identity: boolean;
  initial_message_sample: string;
}

export type T1DisclosureObservationStatus = Extract<ObservationStatus, "detected" | "not_detected">;

export interface T1DisclosureDetail {
  disclosure_timing?: DisclosureTiming;
  context_exceptions_note?: boolean;
  obviousness_signals?: ObviousnessSignals;
}

export interface T1DisclosureFinding {
  observationStatus: T1DisclosureObservationStatus;
  detail: T1DisclosureDetail;
}

/**
 * §5.1 — tabla de derivación. Única función que produce el assessmentStatus
 * de T1; no debe existir otro camino en el código que fije este valor.
 *
 * Combinaciones no listadas en la tabla (p. ej. channel `detected` sin
 * ai_evidence todavía observado) caen en `insufficient_evidence` por la regla
 * de autonomía de §7: si el motor no puede decidir, no decide.
 */
export function deriveT1Assessment(
  channel: T1ChannelFinding,
  aiEvidence?: T1AiEvidenceFinding,
  disclosure?: T1DisclosureFinding,
): AssessmentStatus {
  if (channel.observationStatus === "not_detected") {
    return "not_applicable";
  }
  if (channel.observationStatus === "not_assessable" || channel.observationStatus === "error") {
    return "insufficient_evidence";
  }

  // channel.observationStatus === "detected"
  if (!aiEvidence) {
    return "insufficient_evidence";
  }
  if (aiEvidence.observationStatus === "not_detected") {
    return aiEvidence.detail.evidence_of_human === true ? "not_applicable" : "insufficient_evidence";
  }

  // aiEvidence.observationStatus === "detected"
  if (!disclosure) {
    return "insufficient_evidence";
  }
  return disclosure.observationStatus === "detected" ? "aligned" : "action_recommended";
}
