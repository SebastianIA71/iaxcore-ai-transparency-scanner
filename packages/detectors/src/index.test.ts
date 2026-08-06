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

  // T1 (Fase 3) y T2 (Fase 5) se implementan de verdad — ver
  // t1Detector.test.ts/t2Detector.test.ts. T3 sigue fuera del piloto (§5.3).
  it("T3 no está implementado todavía", async () => {
    await expect(t3Detector.run({ evaluationId: "eval_1", finalUrl: "https://example.com" })).rejects.toThrow();
  });
});
