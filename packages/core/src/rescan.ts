import type { AssessmentStatus } from "./vocabulary.js";

export interface T1AssessmentComparison {
  before: AssessmentStatus;
  after: AssessmentStatus;
  changed: boolean;
  resolvedActionRecommended: boolean;
}

/**
 * §10-Fase 4: "comparación entre evaluaciones" — compara el
 * assessmentStatus de T1 entre dos evaluaciones del mismo requestedUrl
 * (típicamente un rescan tras aplicar un fix). No valida que ambas sean
 * realmente de la misma URL ni toca ninguna Evaluation: "sin editar la
 * evaluación anterior" (gate de esta fase) ya está garantizado por cómo se
 * crean las evaluaciones (§7/§10-Fase 1 — siempre una fila nueva, nunca un
 * update), no por nada que esta función deba hacer.
 */
export function compareT1Assessments(before: AssessmentStatus, after: AssessmentStatus): T1AssessmentComparison {
  return {
    before,
    after,
    changed: before !== after,
    resolvedActionRecommended: before === "action_recommended" && after === "aligned",
  };
}
