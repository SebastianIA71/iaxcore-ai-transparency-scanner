import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createFeedback, getFeedbackSummary } from "./feedback.js";

type FakeFeedbackDb = Pick<PrismaClient, "feedback">;

function fakeDb(aggregateResult: { _count: { _all: number }; _avg: { rating: number | null } } = { _count: { _all: 0 }, _avg: { rating: null } }): FakeFeedbackDb {
  return {
    feedback: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "fb_1", ...args.data })),
      aggregate: vi.fn(async () => aggregateResult),
    },
  } as unknown as FakeFeedbackDb;
}

describe("createFeedback — §10-Fase 7: feedback estructurado", () => {
  it("inserta el feedback con los campos dados", async () => {
    const db = fakeDb();
    const input = { evaluationId: "eval_1", rating: 4, comment: "Claro y útil" };

    const feedback = await createFeedback(db, input);

    expect(db.feedback.create).toHaveBeenCalledWith({ data: input });
    expect(feedback).toMatchObject({ id: "fb_1", rating: 4 });
  });
});

describe("getFeedbackSummary", () => {
  it("devuelve el recuento y la media de rating", async () => {
    const db = fakeDb({ _count: { _all: 2 }, _avg: { rating: 3.5 } });

    const summary = await getFeedbackSummary(db);

    expect(summary).toEqual({ count: 2, averageRating: 3.5 });
  });

  it("devuelve averageRating null cuando no hay feedback todavía", async () => {
    const db = fakeDb();

    const summary = await getFeedbackSummary(db);

    expect(summary).toEqual({ count: 0, averageRating: null });
  });
});
