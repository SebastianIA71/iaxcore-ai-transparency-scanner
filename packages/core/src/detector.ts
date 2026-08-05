import type { Finding } from "./entities.js";

// §8/§10-Fase 0: "contratos Detector para T1, T2 y T3 (solo interfaz, sin
// implementación)". El contexto de navegación real (Playwright, páginas
// seleccionadas) se define en Fase 2 con packages/scanner; se deja opaco
// aquí a propósito para no cerrar esa puerta desde Fase 0.
export interface DetectorContext {
  evaluationId: string;
  finalUrl: string;
}

export interface DetectorResult {
  findings: Finding[];
}

export interface Detector<TId extends string = string> {
  readonly id: TId;
  readonly version: string;
  run(context: DetectorContext): Promise<DetectorResult>;
}
