import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPooledClient, type PrismaClient } from "./client.js";
import { createRateLimitedScan, RateLimitExceededError } from "./rateLimit.js";

// §9: "concurrencia máxima de 1 escaneo por IP" — el índice único parcial
// evaluations_one_active_per_ip solo se prueba de verdad contra Postgres real.
describe.skipIf(!process.env.DATABASE_POOLED_URL)("rate limit — índice único parcial contra Postgres real", () => {
  let db: PrismaClient;
  const evaluationIds: string[] = [];

  beforeAll(() => {
    db = createPooledClient();
  });

  afterAll(async () => {
    if (evaluationIds.length > 0) {
      await db.scanJob.deleteMany({ where: { evaluationId: { in: evaluationIds } } });
      await db.evaluation.deleteMany({ where: { id: { in: evaluationIds } } });
    }
    await db.$disconnect();
  });

  it("crea la Evaluation y su ScanJob juntos, y rechaza una segunda para la misma IP", async () => {
    const requesterIpHash = `rate-limit-integration-${Date.now()}`;
    const first = await createRateLimitedScan(
      db,
      { requestedUrl: "https://example.com/a", methodVersion: "v1", pagesRequested: 1, requesterIpHash },
      { dailyQuota: 10 },
    );
    evaluationIds.push(first.id);

    const scanJob = await db.scanJob.findUnique({ where: { evaluationId: first.id } });
    expect(scanJob).not.toBeNull();

    const error = await createRateLimitedScan(
      db,
      { requestedUrl: "https://example.com/b", methodVersion: "v1", pagesRequested: 1, requesterIpHash },
      { dailyQuota: 10 },
    ).catch((e) => e);

    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect(error.reason).toBe("concurrent_scan");

    const count = await db.evaluation.count({ where: { requesterIpHash } });
    expect(count).toBe(1);
  });
});
