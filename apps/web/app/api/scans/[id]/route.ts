import { findFindingsByEvaluation } from "@iaxcore/db";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §14: soporta el polling de /scan/{evaluationId} — findings solo se
// consultan una vez completada (o failed), para no pagar el join en cada
// poll mientras todavía está queued/running y no hay nada que mostrar.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const db = getDb();
  const evaluation = await db.evaluation.findUnique({ where: { id } });
  if (!evaluation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const findings =
    evaluation.status === "completed" || evaluation.status === "failed" ? await findFindingsByEvaluation(db, id) : [];

  return NextResponse.json({
    id: evaluation.id,
    status: evaluation.status,
    requestedUrl: evaluation.requestedUrl,
    finalUrl: evaluation.finalUrl,
    methodVersion: evaluation.methodVersion,
    pagesRequested: evaluation.pagesRequested,
    pagesAnalyzed: evaluation.pagesAnalyzed,
    manifest: evaluation.manifest,
    reportHash: evaluation.reportHash,
    signatureId: evaluation.signatureId,
    createdAt: evaluation.createdAt,
    completedAt: evaluation.completedAt,
    findings: findings.map((f) => ({
      detectorId: f.detectorId,
      observationStatus: f.observationStatus,
      assessmentStatus: f.assessmentStatus,
      confidenceBand: f.confidenceBand,
      summaryKey: f.summaryKey,
      detail: f.detail,
    })),
  });
}
