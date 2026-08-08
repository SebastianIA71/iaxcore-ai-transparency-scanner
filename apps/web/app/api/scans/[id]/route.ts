import { compareT1Assessments } from "@iaxcore/core";
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

  // §10-Fase 4: si esta evaluación es un rescan, compara el veredicto T1
  // con el de la evaluación que la originó — solo tiene sentido una vez
  // ambas están completed (la anterior lo está por construcción, ya que es
  // un requisito para crear el rescan; ver app/api/scans/[id]/rescan).
  let rescanComparison: ReturnType<typeof compareT1Assessments> | null = null;
  if (evaluation.rescanOfEvaluationId && evaluation.status === "completed") {
    const previousFindings = await findFindingsByEvaluation(db, evaluation.rescanOfEvaluationId);
    const before = previousFindings.find((f) => f.detectorId === "t1.assessment")?.assessmentStatus;
    const after = findings.find((f) => f.detectorId === "t1.assessment")?.assessmentStatus;
    if (before && after) {
      rescanComparison = compareT1Assessments(before, after);
    }
  }

  // Sentido inverso: si esta evaluación ya fue rescaneada, enlaza al
  // rescan más reciente en vez de (o además de) ofrecer volver a escanear.
  const latestRescan = await db.evaluation.findFirst({
    where: { rescanOfEvaluationId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

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
    rescanOfEvaluationId: evaluation.rescanOfEvaluationId,
    latestRescanId: latestRescan?.id ?? null,
    rescanComparison,
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
