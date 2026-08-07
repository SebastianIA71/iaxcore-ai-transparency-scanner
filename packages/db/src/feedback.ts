import type { PrismaClient } from "./generated/prisma/client.js";

type FeedbackDb = Pick<PrismaClient, "feedback">;

// §10-Fase 7: "feedback estructurado" — separado del informe igual que
// Lead (§15), un rating no debe poder alterar una Evaluation ni su firma.
export interface CreateFeedbackInput {
  evaluationId: string;
  rating: number;
  comment?: string;
}

export function createFeedback(db: FeedbackDb, input: CreateFeedbackInput) {
  return db.feedback.create({ data: input });
}

export interface FeedbackSummary {
  count: number;
  averageRating: number | null;
}

// Panel interno (§10-Fase 7).
export async function getFeedbackSummary(db: FeedbackDb): Promise<FeedbackSummary> {
  const result = await db.feedback.aggregate({ _count: { _all: true }, _avg: { rating: true } });
  return { count: result._count._all, averageRating: result._avg.rating };
}
