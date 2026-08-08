import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { reapStaleEvaluations } from "./staleRecovery.js";

type FakeDb = Pick<PrismaClient, "$executeRaw">;

describe("reapStaleEvaluations", () => {
  it("falla las evaluaciones abandonadas y cierra su scan job en dos escrituras", async () => {
    const executeRaw = vi.fn(async () => 1);
    const db = { $executeRaw: executeRaw } as unknown as FakeDb;

    await reapStaleEvaluations(db, 120_000);

    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});
