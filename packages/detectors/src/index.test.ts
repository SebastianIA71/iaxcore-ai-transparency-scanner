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

  it("ningún detector está implementado todavía (T1: Fase 3, T2: Fase 5, T3: fuera del piloto)", async () => {
    await expect(t1Detector.run({ evaluationId: "eval_1", finalUrl: "https://example.com" })).rejects.toThrow();
    await expect(t2Detector.run({ evaluationId: "eval_1", finalUrl: "https://example.com" })).rejects.toThrow();
    await expect(t3Detector.run({ evaluationId: "eval_1", finalUrl: "https://example.com" })).rejects.toThrow();
  });
});
