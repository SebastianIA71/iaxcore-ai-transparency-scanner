import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSigningKeyPair } from "@iaxcore/core";

// runWorkerOnce solo consume la superficie pública de @iaxcore/db y
// @iaxcore/scanner (funciones sueltas, no los métodos de Prisma
// directamente) — al contrario que los tests del propio paquete db, que sí
// necesitan simular $queryRaw/$executeRaw, aquí basta con mockear esas
// funciones. index.integration.test.ts ya prueba el pipeline real contra
// Postgres; esto prueba solo la orquestación: qué le pasa runWorkerOnce a
// runScan() y qué hace con lo que este devuelve.
const claimNextScanJob = vi.fn();
// Resuelven a undefined por defecto — index.ts las await/.catch() sin usar
// su valor de retorno; solo claimNextScanJob y runScan necesitan un valor
// concreto por test, así que esos dos se dejan sin default.
const markEvaluationRunning = vi.fn().mockResolvedValue(undefined);
const completeEvaluation = vi.fn().mockResolvedValue(undefined);
const createReportArtifact = vi.fn().mockResolvedValue(undefined);
const finishScanJob = vi.fn().mockResolvedValue(undefined);
const releaseScanJobAfterFailure = vi.fn().mockResolvedValue(undefined);
const failEvaluation = vi.fn().mockResolvedValue(undefined);
const runScan = vi.fn();

vi.mock("@iaxcore/db", () => ({
  claimNextScanJob: (...args: unknown[]) => claimNextScanJob(...args),
  markEvaluationRunning: (...args: unknown[]) => markEvaluationRunning(...args),
  completeEvaluation: (...args: unknown[]) => completeEvaluation(...args),
  createReportArtifact: (...args: unknown[]) => createReportArtifact(...args),
  finishScanJob: (...args: unknown[]) => finishScanJob(...args),
  releaseScanJobAfterFailure: (...args: unknown[]) => releaseScanJobAfterFailure(...args),
  failEvaluation: (...args: unknown[]) => failEvaluation(...args),
}));

vi.mock("@iaxcore/scanner", () => ({
  runScan: (...args: unknown[]) => runScan(...args),
}));

const { runWorkerOnce } = await import("./index.js");

// signCanonicalJson (@iaxcore/core, no mockeado — es lógica pura, real
// aquí) exige una clave Ed25519 PKCS8 válida; una cadena cualquiera fallaría
// en createPrivateKey() antes de llegar a lo que este test quiere probar.
const signingKeyPair = generateSigningKeyPair("test-key");
const CONFIG = {
  workerId: "w1",
  signingKeyId: signingKeyPair.keyId,
  signingPrivateKeyBase64: signingKeyPair.privateKeyBase64,
};

const EVALUATION = {
  id: "eval-1",
  requestedUrl: "https://example.com/",
  methodVersion: "v1",
  pagesRequested: 5,
};

const SCAN_RESULT = {
  finalUrl: "https://example.com/",
  pagesRequested: 2,
  pagesAnalyzed: 2,
  manifest: {
    consent_interaction: "not_detected",
    pages: [
      { url: "https://example.com/", status: "completed" },
      { url: "https://example.com/about", status: "completed" },
    ],
    blocked_requests: [],
  },
};

function fakeDb() {
  return {
    evaluation: { findUniqueOrThrow: vi.fn(async () => EVALUATION) },
  } as unknown as Parameters<typeof runWorkerOnce>[0];
}

describe("runWorkerOnce — orquestación (§10-Fase 2: cablea runScan al pipeline de Fase 1)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("navega con runScan() usando el tope de páginas de la evaluación, y persiste su resultado", async () => {
    claimNextScanJob.mockResolvedValueOnce({ id: "job-1", evaluationId: "eval-1", attempts: 1 });
    runScan.mockResolvedValueOnce(SCAN_RESULT);
    const db = fakeDb();

    const result = await runWorkerOnce(db, CONFIG);

    expect(result).toEqual({ claimed: true, evaluationId: "eval-1" });
    expect(runScan).toHaveBeenCalledWith(EVALUATION.requestedUrl, { maxPages: EVALUATION.pagesRequested });

    expect(completeEvaluation).toHaveBeenCalledWith(
      db,
      "eval-1",
      expect.objectContaining({
        finalUrl: SCAN_RESULT.finalUrl,
        pagesAnalyzed: SCAN_RESULT.pagesAnalyzed,
        manifest: SCAN_RESULT.manifest,
      }),
    );
    expect(finishScanJob).toHaveBeenCalledWith(db, "job-1");
    expect(failEvaluation).not.toHaveBeenCalled();
  });

  it("sin job disponible, no llama a runScan ni a ninguna transición", async () => {
    claimNextScanJob.mockResolvedValueOnce(null);
    const db = fakeDb();

    const result = await runWorkerOnce(db, CONFIG);

    expect(result).toEqual({ claimed: false });
    expect(runScan).not.toHaveBeenCalled();
    expect(markEvaluationRunning).not.toHaveBeenCalled();
  });

  it("si runScan() falla, libera el job y marca la evaluación como fallida sin completar nada", async () => {
    claimNextScanJob.mockResolvedValueOnce({ id: "job-2", evaluationId: "eval-1", attempts: 1 });
    runScan.mockRejectedValueOnce(new Error("chromium se cayó"));
    const db = fakeDb();

    await expect(runWorkerOnce(db, CONFIG)).rejects.toThrow("chromium se cayó");

    expect(completeEvaluation).not.toHaveBeenCalled();
    expect(releaseScanJobAfterFailure).toHaveBeenCalledWith(db, "job-2", "chromium se cayó");
    expect(failEvaluation).toHaveBeenCalledWith(db, "eval-1");
  });
});
