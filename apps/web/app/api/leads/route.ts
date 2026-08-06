import { createLead } from "@iaxcore/db";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// §7/§10-Fase 7: botón de intención "Solicitar expediente" — no hay
// pasarela de pago, esto solo captura un lead cualificado (email +
// consentimiento explícito para que le contacten) para seguimiento manual.
// Independiente de Evaluation/ReportArtifact (§15) — nunca escribe en ellos.
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
  const { email, evaluationId, contactConsent } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (typeof evaluationId !== "string" || !evaluationId) {
    return NextResponse.json({ error: "invalid_evaluation" }, { status: 400 });
  }
  if (contactConsent !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const db = getDb();
  const evaluation = await db.evaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) {
    return NextResponse.json({ error: "invalid_evaluation" }, { status: 400 });
  }

  const lead = await createLead(db, {
    email,
    evaluationId,
    consent: { contactConsent: true },
    priceInterestClicked: true,
  });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
