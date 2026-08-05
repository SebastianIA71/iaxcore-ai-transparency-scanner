import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import {
  claimNextScanJob,
  finishScanJob,
  recordHeartbeat,
  releaseScanJobAfterFailure,
  releaseStaleScanJobs,
} from "./queue.js";

type FakeQueueDb = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

describe("claimNextScanJob", () => {
  it("devuelve el job reclamado cuando SKIP LOCKED encuentra una fila", async () => {
    const db = {
      $queryRaw: vi.fn(async () => [{ id: "job_1", evaluationId: "eval_1", attempts: 1 }]),
      $executeRaw: vi.fn(),
    } as unknown as FakeQueueDb;

    expect(await claimNextScanJob(db, "worker-1")).toEqual({ id: "job_1", evaluationId: "eval_1", attempts: 1 });
  });

  it("devuelve null cuando no hay ningún job disponible", async () => {
    const db = { $queryRaw: vi.fn(async () => []), $executeRaw: vi.fn() } as unknown as FakeQueueDb;
    expect(await claimNextScanJob(db, "worker-1")).toBeNull();
  });
});

describe("heartbeat / finish / release — delegan en $executeRaw", () => {
  it("recordHeartbeat, finishScanJob, releaseScanJobAfterFailure y releaseStaleScanJobs ejecutan una escritura cada uno", async () => {
    const executeRaw = vi.fn(async () => 1);
    const db = { $queryRaw: vi.fn(), $executeRaw: executeRaw } as unknown as FakeQueueDb;

    await recordHeartbeat(db, "job_1");
    await finishScanJob(db, "job_1");
    await releaseScanJobAfterFailure(db, "job_1", "boom");
    await releaseStaleScanJobs(db, 60_000);

    expect(executeRaw).toHaveBeenCalledTimes(4);
  });
});
