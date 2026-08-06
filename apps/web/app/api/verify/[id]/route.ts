import { buildCanonicalReport, canonicalizeForSigning, verifyCanonicalJsonSignature, type Finding } from "@iaxcore/core";
import { findFindingsByEvaluation, findLatestReportArtifact } from "@iaxcore/db";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §14: "/verify acepta evaluation_id (verificación por servidor, piloto)".
// Reconstruye el mismo objeto canónico que se firmó (buildCanonicalReport —
// packages/core, compartida con packages/pipeline para que nunca puedan
// divergir) a partir de lo que hay en Postgres, y comprueba la firma con la
// clave pública publicada en /.well-known/iaxcore-keys.json — no confía en
// el reportHash/signatureId ya guardados en la Evaluation, los recalcula.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const evaluation = await db.evaluation.findUnique({ where: { id } });
  if (!evaluation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (evaluation.status !== "completed") {
    return NextResponse.json({ verified: false, reason: "not_completed", status: evaluation.status });
  }

  const artifact = await findLatestReportArtifact(db, id);
  if (!artifact || !artifact.signature || !artifact.keyId) {
    return NextResponse.json({ verified: false, reason: "no_signature" });
  }

  const expectedKeyId = process.env.SIGNING_KEY_ID;
  const publicKeyBase64 = process.env.SIGNING_PUBLIC_KEY_B64;
  if (!expectedKeyId || !publicKeyBase64 || artifact.keyId !== expectedKeyId) {
    return NextResponse.json({ verified: false, reason: "unknown_key", keyId: artifact.keyId });
  }

  const findings = await findFindingsByEvaluation(db, id);
  const canonicalReport = buildCanonicalReport({
    evaluationId: evaluation.id,
    requestedUrl: evaluation.requestedUrl,
    methodVersion: evaluation.methodVersion,
    // detectorId/observationStatus/etc. son columnas String/enum de Prisma
    // (§ "Detector IDs... String, not Postgres enums" en CLAUDE.md) — ya
    // validadas contra el vocabulario cerrado en el límite de escritura
    // (createFindings), no aquí; el cast es hacia el mismo vocabulario, no
    // un ensanchamiento de tipo.
    findings: findings.map(
      (f): Finding => ({
        evaluationId: f.evaluationId,
        detectorId: f.detectorId as Finding["detectorId"],
        observationStatus: f.observationStatus,
        assessmentStatus: f.assessmentStatus ?? undefined,
        confidenceBand: f.confidenceBand,
        summaryKey: f.summaryKey,
        detail: f.detail as Record<string, unknown>,
      }),
    ),
  });

  const canonicalJson = canonicalizeForSigning(canonicalReport);
  const recomputedHash = `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
  const signatureValid = verifyCanonicalJsonSignature(publicKeyBase64, canonicalReport, artifact.signature);

  return NextResponse.json({
    verified: signatureValid && recomputedHash === artifact.canonicalHash,
    evaluationId: evaluation.id,
    requestedUrl: evaluation.requestedUrl,
    finalUrl: evaluation.finalUrl,
    completedAt: evaluation.completedAt,
    keyId: artifact.keyId,
    canonicalHash: artifact.canonicalHash,
    hashMatches: recomputedHash === artifact.canonicalHash,
    signatureValid,
  });
}
