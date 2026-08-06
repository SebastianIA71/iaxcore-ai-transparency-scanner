import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createReportArtifact, findLatestReportArtifact } from "./reportArtifacts.js";

type FakeDb = Pick<PrismaClient, "reportArtifact">;

function fakeDb(): FakeDb {
  return {
    reportArtifact: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "artifact_1", ...args.data })),
      findFirst: vi.fn(async () => ({ id: "artifact_1", evaluationId: "eval_1" })),
    },
  } as unknown as FakeDb;
}

describe("createReportArtifact", () => {
  it("inserta el artefacto con los campos dados", async () => {
    const db = fakeDb();
    const input = { evaluationId: "eval_1", format: "json" as const, canonicalHash: "sha256:abc", signature: "sig", keyId: "key_1" };
    await createReportArtifact(db, input);
    expect(db.reportArtifact.create).toHaveBeenCalledWith({ data: input });
  });
});

describe("findLatestReportArtifact — §14: base de /verify", () => {
  it("consulta por evaluationId, el más reciente primero", async () => {
    const db = fakeDb();
    await findLatestReportArtifact(db, "eval_1");
    expect(db.reportArtifact.findFirst).toHaveBeenCalledWith({
      where: { evaluationId: "eval_1" },
      orderBy: { createdAt: "desc" },
    });
  });
});
