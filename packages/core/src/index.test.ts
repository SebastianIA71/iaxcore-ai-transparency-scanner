import { describe, expect, it } from "vitest";
import * as core from "./index.js";

describe("superficie pública de @iaxcore/core", () => {
  it("exporta el vocabulario, deriveT1Assessment, los esquemas de entidades y el contrato Detector", () => {
    expect(core.OBSERVATION_STATUSES).toBeDefined();
    expect(core.ASSESSMENT_STATUSES).toBeDefined();
    expect(typeof core.deriveT1Assessment).toBe("function");
    expect(typeof core.canonicalizeForSigning).toBe("function");
    expect(core.findingSchema).toBeDefined();
    expect(core.evaluationSchema).toBeDefined();
    expect(core.COPY).toBeDefined();
  });
});
