import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §14: soporta el polling de /scan/{evaluationId}.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const evaluation = await getDb().evaluation.findUnique({ where: { id } });
  if (!evaluation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: evaluation.id,
    status: evaluation.status,
    requestedUrl: evaluation.requestedUrl,
    finalUrl: evaluation.finalUrl,
    methodVersion: evaluation.methodVersion,
    pagesRequested: evaluation.pagesRequested,
    pagesAnalyzed: evaluation.pagesAnalyzed,
    createdAt: evaluation.createdAt,
    completedAt: evaluation.completedAt,
  });
}
