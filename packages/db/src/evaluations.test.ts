import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import {
  completeEvaluation,
  createEvaluation,
  failEvaluation,
  ImmutableEvaluationTransitionError,
  markEvaluationRunning,
} from "./evaluations.js";

type FakeEvaluationsDb = Pick<PrismaClient, "evaluation">;

function fakeDb(updateManyResult = 1): FakeEvaluationsDb {
  return {
    evaluation: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "eval_1", ...args.data })),
      updateMany: vi.fn(async () => ({ count: updateManyResult })),
    },
  } as unknown as FakeEvaluationsDb;
}

const completeInput = {
  finalUrl: "https://example.com",
  pagesAnalyzed: 4,
  manifest: {},
  reportHash: "sha256:abc",
  signatureId: "key_1",
};

describe("createEvaluation", () => {
  it("crea la evaluación en estado queued con pagesAnalyzed en 0", async () => {
    const db = fakeDb();
    await createEvaluation(db, { requestedUrl: "https://example.com", methodVersion: "v1", pagesRequested: 5 });
    expect(db.evaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "queued", pagesAnalyzed: 0, requestedUrl: "https://example.com" }),
    });
  });
});

describe("transiciones de estado — inmutabilidad (§7, §10-Fase 1)", () => {
  it("markEvaluationRunning transiciona solo desde queued", async () => {
    const db = fakeDb(1);
    await expect(markEvaluationRunning(db, "eval_1")).resolves.toBeUndefined();
    expect(db.evaluation.updateMany).toHaveBeenCalledWith({
      where: { id: "eval_1", status: "queued" },
      data: { status: "running" },
    });
  });

  it("markEvaluationRunning lanza si la evaluación no está en queued (ya transicionada o inexistente)", async () => {
    const db = fakeDb(0);
    await expect(markEvaluationRunning(db, "eval_1")).rejects.toThrow(ImmutableEvaluationTransitionError);
  });

  it("completeEvaluation solo transiciona desde running", async () => {
    const db = fakeDb(0);
    await expect(completeEvaluation(db, "eval_1", completeInput)).rejects.toThrow(ImmutableEvaluationTransitionError);
  });

  it("no se puede completar dos veces la misma evaluación", async () => {
    let calls = 0;
    const db = {
      evaluation: {
        updateMany: vi.fn(async () => {
          calls += 1;
          return { count: calls === 1 ? 1 : 0 };
        }),
      },
    } as unknown as FakeEvaluationsDb;

    await completeEvaluation(db, "eval_1", completeInput);
    await expect(completeEvaluation(db, "eval_1", completeInput)).rejects.toThrow(ImmutableEvaluationTransitionError);
  });

  it("failEvaluation transiciona desde queued o running", async () => {
    const db = fakeDb(1);
    await expect(failEvaluation(db, "eval_1")).resolves.toBeUndefined();
    expect(db.evaluation.updateMany).toHaveBeenCalledWith({
      where: { id: "eval_1", status: { in: ["queued", "running"] } },
      data: expect.objectContaining({ status: "failed" }),
    });
  });

  it("failEvaluation lanza si la evaluación ya está completed/failed", async () => {
    const db = fakeDb(0);
    await expect(failEvaluation(db, "eval_1")).rejects.toThrow(ImmutableEvaluationTransitionError);
  });
});
