import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPooledClient, type PrismaClient } from "./client.js";
import { completeEvaluation, createEvaluation, failEvaluation, ImmutableEvaluationTransitionError, markEvaluationRunning } from "./evaluations.js";

// §10-Fase 1, pruebas obligatorias: "Inmutabilidad". Necesita Postgres real —
// se salta si no hay DATABASE_POOLED_URL (CI/otros devs sin credenciales).
// createPooledClient() vive en beforeAll (no en el cuerpo de describe): un
// describe.skipIf saltado también salta sus hooks, así que nunca se llama
// sin credenciales — llamarlo fuera de un hook se ejecutaría igual aunque
// los tests estén saltados.
describe.skipIf(!process.env.DATABASE_POOLED_URL)("inmutabilidad de Evaluation contra Postgres real", () => {
  let db: PrismaClient;
  const createdIds: string[] = [];

  beforeAll(() => {
    db = createPooledClient();
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await db.evaluation.deleteMany({ where: { id: { in: createdIds } } });
    }
    await db.$disconnect();
  });

  it("queued → running → completed pasa, y no puede alterarse después", async () => {
    const evaluation = await createEvaluation(db, {
      requestedUrl: "https://example.com",
      methodVersion: "iaxcore-ai-transparency@0.1.0",
      pagesRequested: 5,
    });
    createdIds.push(evaluation.id);

    await markEvaluationRunning(db, evaluation.id);
    await completeEvaluation(db, evaluation.id, {
      finalUrl: "https://example.com/",
      pagesAnalyzed: 4,
      manifest: { consent_interaction: "accepted_banner" },
      reportHash: "sha256:integration-test",
      signatureId: "key_test",
    });

    const stored = await db.evaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
    expect(stored.status).toBe("completed");
    expect(stored.pagesAnalyzed).toBe(4);

    // Ya completada: ninguna transición puede volver a tocarla.
    await expect(markEvaluationRunning(db, evaluation.id)).rejects.toThrow(ImmutableEvaluationTransitionError);
    await expect(
      completeEvaluation(db, evaluation.id, {
        finalUrl: "https://example.com/other",
        pagesAnalyzed: 1,
        manifest: {},
        reportHash: "sha256:should-not-apply",
        signatureId: "key_should_not_apply",
      }),
    ).rejects.toThrow(ImmutableEvaluationTransitionError);
    await expect(failEvaluation(db, evaluation.id)).rejects.toThrow(ImmutableEvaluationTransitionError);

    // El intento fallido no dejó rastro: el reportHash original sigue intacto.
    const unchanged = await db.evaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
    expect(unchanged.reportHash).toBe("sha256:integration-test");
  });
});
