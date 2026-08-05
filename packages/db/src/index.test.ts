import { describe, expect, it } from "vitest";
import * as db from "./index.js";

describe("superficie pública de @iaxcore/db", () => {
  it("exporta los factories de cliente, las transiciones de Evaluation y la cola", () => {
    expect(typeof db.createPooledClient).toBe("function");
    expect(typeof db.createDirectClient).toBe("function");
    expect(typeof db.createEvaluation).toBe("function");
    expect(typeof db.markEvaluationRunning).toBe("function");
    expect(typeof db.completeEvaluation).toBe("function");
    expect(typeof db.failEvaluation).toBe("function");
    expect(typeof db.claimNextScanJob).toBe("function");
  });
});
