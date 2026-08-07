import { createFeedback } from "@iaxcore/db";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §10-Fase 7: "feedback estructurado" — un rating de 1 a 5 más un
// comentario libre opcional, independiente del informe (§15, igual que
// Lead) para que nunca pueda alterar una Evaluation ni su firma.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { evaluationId, rating, comment } = body as Record<string, unknown>;

  if (typeof evaluationId !== "string" || !evaluationId) {
    return NextResponse.json({ error: "invalid_evaluation" }, { status: 400 });
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating" }, { status: 400 });
  }
  if (comment !== undefined && typeof comment !== "string") {
    return NextResponse.json({ error: "invalid_comment" }, { status: 400 });
  }

  const db = getDb();
  const evaluation = await db.evaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) {
    return NextResponse.json({ error: "invalid_evaluation" }, { status: 400 });
  }

  const feedback = await createFeedback(db, {
    evaluationId,
    rating,
    comment: comment && comment.trim() ? comment.trim().slice(0, 2000) : undefined,
  });

  return NextResponse.json({ id: feedback.id }, { status: 201 });
}
