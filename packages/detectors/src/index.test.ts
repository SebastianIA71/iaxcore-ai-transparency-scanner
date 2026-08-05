import { describe, expect, it } from "vitest";
import { t1Detector, t2Detector, t3Detector } from "./index.js";

describe("contratos T1/T2/T3 — Fase 0, solo interfaz (§10, §19)", () => {
  it("cada detector expone id y version y cumple el contrato Detector", () => {
    for (const detector of [t1Detector, t2Detector, t3Detector]) {
      expect(typeof detector.id).toBe("string");
      expect(typeof detector.version).toBe("string");
      expect(typeof detector.run).toBe("function");
    }
  });

  // T1 se implementa en Fase 3 — ver t1Detector.test.ts para su cobertura
  // real. T2 (Fase 5, no bloqueante) y T3 (fuera del piloto, §5.3) siguen
  // siendo solo contrato.
  it("T2/T3 no están implementados todavía", async () => {
    await expect(t2Detector.run({ evaluationId: "eval_1", finalUrl: "https://example.com" })).rejects.toThrow();
    await expect(t3Detector.run({ evaluationId: "eval_1", finalUrl: "https://example.com" })).rejects.toThrow();
  });
});
