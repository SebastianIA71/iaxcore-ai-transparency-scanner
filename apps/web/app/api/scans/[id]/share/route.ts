import { createShareLink, findLatestReportArtifact, recordTelemetryEvent } from "@iaxcore/db";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §9: "la caducidad del ShareLink es independiente y siempre ≤ retención de
// capturas" (90 días — ver §9/§14 sobre purga de Evidence). 30 días se
// queda con margen de sobra sin necesitar coordinarse con ese número.
const SHARE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// §14/§10-Fase 7: "informe privado" — POST porque crea un recurso nuevo
// (un token) cada vez que se llama; no es idempotente a propósito, cada
// enlace es revocable por separado sin afectar a los demás.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const evaluation = await db.evaluation.findUnique({ where: { id } });
  if (!evaluation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (evaluation.status !== "completed") {
    return NextResponse.json({ error: "not_completed" }, { status: 400 });
  }

  const artifact = await findLatestReportArtifact(db, id);
  if (!artifact) {
    return NextResponse.json({ error: "no_report" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + SHARE_LINK_TTL_MS);
  const shareLink = await createShareLink(db, { reportArtifactId: artifact.id, expiresAt });
  await recordTelemetryEvent(db, { kind: "share_link_created", evaluationId: id });

  return NextResponse.json({ token: shareLink.token, path: `/r/${shareLink.token}`, expiresAt }, { status: 201 });
}
