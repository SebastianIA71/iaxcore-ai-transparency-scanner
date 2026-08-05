import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalizeForSigning, verifyCanonicalJsonSignature } from "@iaxcore/core";
import { createEvaluation, createPooledClient, type PrismaClient } from "@iaxcore/db";
import { runWorkerOnce, type WorkerConfig } from "./index.js";

// §10-Fase 1, gate de salida: "una evaluación simulada pasa
// queued → running → completed, no puede alterarse y su firma puede
// verificarse de forma independiente". Necesita Postgres real y una clave de
// firma real — se salta si faltan.
const canRun = Boolean(process.env.DATABASE_POOLED_URL && process.env.SIGNING_KEY_ID && process.env.SIGNING_PRIVATE_KEY_B64 && process.env.SIGNING_PUBLIC_KEY_B64);

describe.skipIf(!canRun)("worker — pipeline completo contra Postgres real", () => {
  let db: PrismaClient;
  const evaluationIds: string[] = [];
  const jobIds: string[] = [];

  beforeAll(() => {
    db = createPooledClient();
  });

  afterAll(async () => {
    if (jobIds.length > 0) {
      await db.scanJob.deleteMany({ where: { id: { in: jobIds } } });
    }
    if (evaluationIds.length > 0) {
      await db.reportArtifact.deleteMany({ where: { evaluationId: { in: evaluationIds } } });
      await db.evaluation.deleteMany({ where: { id: { in: evaluationIds } } });
    }
    await db.$disconnect();
  });

  it("claim → running → completed, con firma verificable independientemente", async () => {
    const evaluation = await createEvaluation(db, {
      requestedUrl: "https://example.com/worker-e2e",
      methodVersion: "iaxcore-ai-transparency@0.1.0",
      pagesRequested: 1,
      requesterIpHash: "worker-integration-test-ip-hash",
    });
    evaluationIds.push(evaluation.id);
    const job = await db.scanJob.create({ data: { evaluationId: evaluation.id } });
    jobIds.push(job.id);

    const config: WorkerConfig = {
      workerId: "worker-integration-test",
      signingKeyId: process.env.SIGNING_KEY_ID!,
      signingPrivateKeyBase64: process.env.SIGNING_PRIVATE_KEY_B64!,
    };

    const result = await runWorkerOnce(db, config);
    expect(result).toEqual({ claimed: true, evaluationId: evaluation.id });

    const completed = await db.evaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
    expect(completed.status).toBe("completed");
    expect(completed.reportHash).toBeTruthy();
    expect(completed.signatureId).toBe(config.signingKeyId);

    const artifact = await db.reportArtifact.findFirstOrThrow({ where: { evaluationId: evaluation.id } });
    expect(artifact.format).toBe("json");
    expect(artifact.signature).toBeTruthy();

    // Verificación independiente: reconstruye el mismo objeto canónico que
    // firmó el worker y comprueba la firma con la clave pública publicada.
    const canonicalReport = {
      evaluationId: evaluation.id,
      requestedUrl: evaluation.requestedUrl,
      methodVersion: evaluation.methodVersion,
      findings: [] as unknown[],
    };
    const isValid = verifyCanonicalJsonSignature(
      process.env.SIGNING_PUBLIC_KEY_B64!,
      canonicalReport,
      artifact.signature!,
    );
    expect(isValid).toBe(true);

    // El hash publicado corresponde al mismo canónico.
    const canonicalJson = canonicalizeForSigning(canonicalReport);
    const { createHash } = await import("node:crypto");
    expect(artifact.canonicalHash).toBe(`sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`);

    const finishedJob = await db.scanJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(finishedJob.finishedAt).not.toBeNull();
  });

  it("sin jobs disponibles, no reclama nada", async () => {
    const config: WorkerConfig = {
      workerId: "worker-integration-test-idle",
      signingKeyId: process.env.SIGNING_KEY_ID!,
      signingPrivateKeyBase64: process.env.SIGNING_PRIVATE_KEY_B64!,
    };
    const result = await runWorkerOnce(db, config);
    expect(result.claimed).toBe(false);
  });
});
