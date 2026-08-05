import type { ObviousnessSignals } from "@iaxcore/core";
import type { ProviderSignature } from "../signatures/index.js";
import {
  AI_EVIDENCE_PATTERNS,
  AI_SUGGESTIVE_NAME_PATTERNS,
  DISCLOSURE_PATTERNS,
  HUMAN_EVIDENCE_PATTERNS,
  matchesAny,
} from "./patterns.js";

export interface AiEvidenceResult {
  status: "detected" | "not_detected";
  evidenceOfHuman: boolean;
  confidence: "high" | "medium" | "low";
}

// §5.1: t1.ai_evidence se decide aparte del canal — un proveedor ai_native
// conocido basta por sí solo (alta confianza); si no, se recurre al texto
// visible del panel ya abierto.
export function classifyAiEvidence(vendor: ProviderSignature | null, panelText: string): AiEvidenceResult {
  if (vendor?.class === "ai_native") {
    return { status: "detected", evidenceOfHuman: false, confidence: "high" };
  }
  if (matchesAny(panelText, AI_EVIDENCE_PATTERNS)) {
    return { status: "detected", evidenceOfHuman: false, confidence: "medium" };
  }
  if (matchesAny(panelText, HUMAN_EVIDENCE_PATTERNS)) {
    return { status: "not_detected", evidenceOfHuman: true, confidence: "medium" };
  }
  // Ni evidencia de IA ni de humano — F05: ambigüedad real, no error.
  return { status: "not_detected", evidenceOfHuman: false, confidence: "low" };
}

export interface DisclosureResult {
  status: "detected" | "not_detected";
  confidence: "high" | "medium";
}

// §5.1: el aviso solo cuenta si se dirige a quien visita la página ("estás
// hablando con...") — DISCLOSURE_PATTERNS es más estricto que
// AI_EVIDENCE_PATTERNS a propósito, ver patterns.ts. El panel ya se leyó
// justo después de abrirse (channel.ts), así que "detected" aquí implica
// disclosure_timing: "on_open" — no hay otro momento que este motor observe.
export function classifyDisclosure(panelText: string): DisclosureResult {
  if (matchesAny(panelText, DISCLOSURE_PATTERNS)) {
    return { status: "detected", confidence: "high" };
  }
  return { status: "not_detected", confidence: "medium" };
}

// §5.1/§21 (resuelta #2): captura estructurada para la excepción de
// obviedad — nunca decide si aplica, solo dejar evidencia reproducible.
// Los tres campos que no se pueden inferir de texto con confianza razonable
// (avatar, identidad simulada) se dejan en su valor "sin evidencia" en vez
// de adivinar — sobre-afirmar aquí sería peor que no afirmar nada.
export function buildObviousnessSignals(panelText: string, vendor: ProviderSignature | null): ObviousnessSignals {
  const nameSource = vendor?.vendor ?? panelText.slice(0, 60);
  return {
    assistant_name_suggests_ai: matchesAny(nameSource, AI_SUGGESTIVE_NAME_PATTERNS),
    assistant_avatar_type: "none",
    simulates_human_identity: false,
    initial_message_sample: panelText.slice(0, 200),
  };
}
