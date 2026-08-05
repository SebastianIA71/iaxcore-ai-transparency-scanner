import { describe, expect, it } from "vitest";
import { compareT1Assessments } from "./rescan.js";

describe("compareT1Assessments — §10-Fase 4: comparación entre evaluaciones", () => {
  it("F03→F02: action_recommended a aligned tras aplicar el fix — resolvedActionRecommended", () => {
    const result = compareT1Assessments("action_recommended", "aligned");
    expect(result).toEqual({
      before: "action_recommended",
      after: "aligned",
      changed: true,
      resolvedActionRecommended: true,
    });
  });

  it("sin cambios entre dos evaluaciones", () => {
    const result = compareT1Assessments("aligned", "aligned");
    expect(result.changed).toBe(false);
    expect(result.resolvedActionRecommended).toBe(false);
  });

  it("cambia pero no hacia aligned — no cuenta como resolución", () => {
    const result = compareT1Assessments("action_recommended", "insufficient_evidence");
    expect(result.changed).toBe(true);
    expect(result.resolvedActionRecommended).toBe(false);
  });

  it("aligned ya de entrada, sigue aligned tras rescan — no es una 'resolución' (no partía de action_recommended)", () => {
    const result = compareT1Assessments("not_applicable", "aligned");
    expect(result.resolvedActionRecommended).toBe(false);
  });
});
