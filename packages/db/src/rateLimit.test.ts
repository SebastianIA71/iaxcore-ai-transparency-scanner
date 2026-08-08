import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "./generated/prisma/client.js";
import { assertWithinRateLimit, createRateLimitedScan, RateLimitExceededError } from "./rateLimit.js";

type FakeDb = PrismaClient;

function fakeDb(counts: { concurrent: number; daily: number }, createImpl?: () => Promise<unknown>): FakeDb {
  const count = vi.fn().mockResolvedValueOnce(counts.concurrent).mockResolvedValueOnce(counts.daily);
  const db = {
    evaluation: {
      count,
      create: vi.fn(createImpl ?? (async () => ({ id: "eval_1" }))),
    },
    scanJob: {
      create: vi.fn(async () => ({ id: "job_1" })),
    },
    $executeRaw: vi.fn(async () => 0),
  };
  // $transaction ejecuta el callback pasándole el mismo fake db como "tx" —
  // suficiente para probar la orquestación sin una base de datos real.
  (db as unknown as { $transaction: unknown }).$transaction = vi.fn((callback: (tx: typeof db) => unknown) =>
    callback(db),
  );
  return db as unknown as FakeDb;
}

const input = {
  requestedUrl: "https://example.com",
  methodVersion: "v1",
  pagesRequested: 1,
  requesterIpHash: "ip-hash-1",
};

describe("assertWithinRateLimit (§9)", () => {
  it("no lanza si no hay escaneo concurrente ni se agotó la cuota diaria", async () => {
    const db = fakeDb({ concurrent: 0, daily: 0 });
    await expect(assertWithinRateLimit(db, "ip-hash-1", { dailyQuota: 5 })).resolves.toBeUndefined();
  });

  it("lanza concurrent_scan si ya hay una evaluación queued/running para esa IP", async () => {
    const db = fakeDb({ concurrent: 1, daily: 0 });
    const error = await assertWithinRateLimit(db, "ip-hash-1", { dailyQuota: 5 }).catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect(error.reason).toBe("concurrent_scan");
  });

  it("lanza daily_quota si se alcanzó el límite diario", async () => {
    const db = fakeDb({ concurrent: 0, daily: 5 });
    const error = await assertWithinRateLimit(db, "ip-hash-1", { dailyQuota: 5 }).catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect(error.reason).toBe("daily_quota");
  });
});

describe("createRateLimitedScan — Evaluation + ScanJob atómicos, cierra la carrera TOCTOU (§9)", () => {
  it("crea la evaluación y su scan job en la misma transacción", async () => {
    const db = fakeDb({ concurrent: 0, daily: 0 });
    const result = await createRateLimitedScan(db, input, { dailyQuota: 5 });
    expect(result).toEqual({ id: "eval_1" });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.scanJob.create).toHaveBeenCalledWith({ data: { evaluationId: "eval_1" } });
  });

  it("traduce una violación del índice único parcial (P2002) a RateLimitExceededError", async () => {
    const db = fakeDb({ concurrent: 0, daily: 0 }, async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      });
    });
    const error = await createRateLimitedScan(db, input, { dailyQuota: 5 }).catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect(error.reason).toBe("concurrent_scan");
  });

  it("relanza cualquier otro error del insert sin envolverlo", async () => {
    const db = fakeDb({ concurrent: 0, daily: 0 }, async () => {
      throw new Error("boom");
    });
    await expect(createRateLimitedScan(db, input, { dailyQuota: 5 })).rejects.toThrow("boom");
  });

  it("recupera evaluaciones abandonadas antes de contar concurrencia", async () => {
    const db = fakeDb({ concurrent: 0, daily: 0 });
    await createRateLimitedScan(db, input, { dailyQuota: 5 });
    // reapStaleEvaluations hace dos escrituras (evaluations, luego scan_jobs).
    expect(db.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
