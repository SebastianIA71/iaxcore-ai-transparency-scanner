import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPooledClient, type PrismaClient } from "./client.js";
import { createEvaluation } from "./evaluations.js";
import { claimNextScanJob } from "./queue.js";

// §10-Fase 1, pruebas obligatorias: "doble reclamación de job". SKIP LOCKED
// solo demuestra algo si hay contención real entre conexiones distintas —
// necesita Postgres real, se salta si no hay DATABASE_POOLED_URL. Los
// clientes viven en beforeAll (ver evaluations.integration.test.ts para el
// porqué: un describe.skipIf saltado también salta sus hooks).
describe.skipIf(!process.env.DATABASE_POOLED_URL)("SKIP LOCKED — cola bajo concurrencia real", () => {
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
      await db.evaluation.deleteMany({ where: { id: { in: evaluationIds } } });
    }
    await db.$disconnect();
  });

  it("varios workers compitiendo por la cola nunca reclaman el mismo job dos veces", async () => {
    const jobCount = 5;
    for (let i = 0; i < jobCount; i++) {
      const evaluation = await createEvaluation(db, {
        requestedUrl: `https://example.com/${i}`,
        methodVersion: "iaxcore-ai-transparency@0.1.0",
        pagesRequested: 1,
      });
      evaluationIds.push(evaluation.id);
      const job = await db.scanJob.create({ data: { evaluationId: evaluation.id } });
      jobIds.push(job.id);
    }

    // Conexiones independientes (workers reales), más intentos de claim que
    // jobs disponibles, todos disparados a la vez.
    const workers = Array.from({ length: 3 }, () => createPooledClient());
    const attempts = Array.from({ length: jobCount + 5 }, (_, i) =>
      claimNextScanJob(workers[i % workers.length], `worker-${i % workers.length}`),
    );
    const results = await Promise.all(attempts);
    await Promise.all(workers.map((w) => w.$disconnect()));

    const claimedIds = results.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.id);

    expect(claimedIds).toHaveLength(jobCount);
    expect(new Set(claimedIds).size).toBe(jobCount);
  });
});
