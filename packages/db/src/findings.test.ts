import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createFindings, findFindingsByEvaluation } from "./findings.js";

type FakeFindingsDb = Pick<PrismaClient, "finding">;

function fakeDb(): FakeFindingsDb {
  return {
    finding: {
      createManyAndReturn: vi.fn(async (args: { data: unknown[] }) =>
        args.data.map((d, i) => ({ id: `finding_${i}`, ...(d as object) })),
      ),
      findMany: vi.fn(async () => []),
    },
  } as unknown as FakeFindingsDb;
}

const t1Findings = [
  {
    evaluationId: "eval_1",
    detectorId: "t1.channel",
    observationStatus: "detected" as const,
    confidenceBand: "high" as const,
    summaryKey: "t1.channel.detected",
    detail: { human_intermediary_detected: false },
  },
  {
    evaluationId: "eval_1",
    detectorId: "t1.assessment",
    observationStatus: "detected" as const,
    assessmentStatus: "aligned" as const,
    confidenceBand: "high" as const,
    summaryKey: "t1.assessment.aligned",
    detail: {},
  },
];

describe("createFindings — persiste varios findings de una corrida en una sola sentencia", () => {
  it("inserta todos los findings y devuelve sus ids", async () => {
    const db = fakeDb();
    const created = await createFindings(db, t1Findings);

    expect(db.finding.createManyAndReturn).toHaveBeenCalledWith({ data: t1Findings });
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ id: "finding_0", detectorId: "t1.channel" });
  });
});

describe("findFindingsByEvaluation", () => {
  it("consulta por evaluationId, ordenado por id para preservar el orden de inserción", async () => {
    const db = fakeDb();
    await findFindingsByEvaluation(db, "eval_1");
    expect(db.finding.findMany).toHaveBeenCalledWith({
      where: { evaluationId: "eval_1" },
      orderBy: { id: "asc" },
    });
  });
});
