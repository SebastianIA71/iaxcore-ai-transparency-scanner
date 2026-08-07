import { findFindingsByEvaluation, resolveShareLink, touchShareLinkAccess } from "@iaxcore/db";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §14: "/r/{shareToken} — informe privado compartible y verificable".
// resolveShareLink() ya descarta tokens revocados/caducados (§9) — un
// token inválido responde exactamente igual que uno inexistente, para no
// filtrar cuál de los dos motivos aplica.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const shareLink = await resolveShareLink(db, token);
  if (!shareLink) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const artifact = await db.reportArtifact.findUnique({ where: { id: shareLink.reportArtifactId } });
  if (!artifact) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const evaluation = await db.evaluation.findUnique({ where: { id: artifact.evaluationId } });
  if (!evaluation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const findings = await findFindingsByEvaluation(db, evaluation.id);
  await touchShareLinkAccess(db, shareLink.id);

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
