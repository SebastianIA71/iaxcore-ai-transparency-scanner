import { COPY } from "@iaxcore/core/copy";
import { findFindingsByEvaluation, recordTelemetryEvent } from "@iaxcore/db";
import { launchSecureBrowser } from "@iaxcore/scanner";
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";

// Chromium serverless (@sparticuz/chromium) puede tardar unos segundos en
// arrancar en frío — igual que /api/scans, más margen del que debería
// necesitar nunca esta ruta (renderizar HTML estático es rápido).
export const maxDuration = 30;

const T = COPY.es;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface PdfFinding {
  detectorId: string;
  observationStatus: keyof typeof T.status.observation;
  assessmentStatus?: string | null;
}

// §8/§19: "Render de una vista estática del informe mediante Playwright.
// Contiene evaluation_id, hash y enlace/QR a /verify. No lleva firma
// criptográfica propia." — deliberadamente más compacto que ReportView (sin
// widgets de Fix/Dossier/Feedback, que no tienen sentido en un documento
// estático); reutilizar ReportView tal cual arrastraría sus componentes
// "use client" con estado (formularios) a un render server-only.
function renderReportHtml(input: {
  evaluationId: string;
  requestedUrl: string;
  finalUrl: string | null;
  methodVersion: string;
  pagesAnalyzed: number;
  pagesRequested: number;
  reportHash: string;
  keyId: string;
  completedAt: string;
  findings: PdfFinding[];
  verifyUrl: string;
  qrDataUri: string;
}): string {
  const t1Sub = ["t1.channel", "t1.ai_evidence", "t1.disclosure"] as const;
  const assessment = input.findings.find((f) => f.detectorId === "t1.assessment");
  const assessmentStatus = assessment?.assessmentStatus as keyof typeof T.status.assessment | undefined;

  const t1Lines = t1Sub
    .map((id) => input.findings.find((f) => f.detectorId === id))
    .filter((f): f is PdfFinding => Boolean(f))
    .map((f) => `${escapeHtml(f.detectorId)}: ${escapeHtml(T.status.observation[f.observationStatus])}`)
    .join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>IAXCORE — ${escapeHtml(input.requestedUrl)}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .muted { color: #666; }
  pre { background: #f5f5f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 12px; }
  .field { margin: 6px 0; }
  .field b { display: inline-block; min-width: 140px; }
  .qr { margin-top: 16px; text-align: center; }
  .qr img { width: 140px; height: 140px; }
  .footer { margin-top: 24px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
  <h1>IAXCORE — Escáner de Transparencia de IA</h1>
  <p class="muted">${escapeHtml(input.requestedUrl)}</p>

  <pre>${t1Lines}${assessmentStatus ? `\n<b>T1: ${escapeHtml(T.status.assessment[assessmentStatus])}</b>` : ""}
${T.scan.pagesAnalyzed}: ${input.pagesAnalyzed}/${input.pagesRequested}
${T.scan.method}: ${escapeHtml(input.methodVersion)}</pre>

  <div class="field"><b>evaluation_id</b>${escapeHtml(input.evaluationId)}</div>
  <div class="field"><b>${escapeHtml(T.verify.fieldHash)}</b>${escapeHtml(input.reportHash)}</div>
  <div class="field"><b>${escapeHtml(T.verify.fieldKeyId)}</b>${escapeHtml(input.keyId)}</div>
  <div class="field"><b>${escapeHtml(T.verify.fieldCompletedAt)}</b>${escapeHtml(input.completedAt)}</div>

  <div class="qr">
    <img src="${input.qrDataUri}" alt="QR" />
    <div class="muted">${escapeHtml(input.verifyUrl)}</div>
  </div>

  <div class="footer">
    Este PDF no lleva firma criptográfica propia — el JSON firmado con Ed25519 es el documento verificable.
    Usa el enlace o el código QR de arriba para comprobar este resultado contra el servidor de IAXCORE.
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const evaluation = await db.evaluation.findUnique({ where: { id } });
  if (!evaluation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (evaluation.status !== "completed" || !evaluation.reportHash || !evaluation.signatureId) {
    return NextResponse.json({ error: "not_completed" }, { status: 400 });
  }

  const findings = await findFindingsByEvaluation(db, id);
  const verifyUrl = new URL(`/verify?id=${id}`, request.nextUrl.origin).href;
  const qrDataUri = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 280 });

  const html = renderReportHtml({
    evaluationId: evaluation.id,
    requestedUrl: evaluation.requestedUrl,
    finalUrl: evaluation.finalUrl,
    methodVersion: evaluation.methodVersion,
    pagesAnalyzed: evaluation.pagesAnalyzed,
    pagesRequested: evaluation.pagesRequested,
    reportHash: evaluation.reportHash,
    keyId: evaluation.signatureId,
    completedAt: evaluation.completedAt?.toISOString() ?? "",
    findings: findings.map((f) => ({
      detectorId: f.detectorId,
      observationStatus: f.observationStatus,
      assessmentStatus: f.assessmentStatus,
    })),
    verifyUrl,
    qrDataUri,
  });

  const browser = await launchSecureBrowser();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await context.close();

    await recordTelemetryEvent(db, { kind: "pdf_downloaded", evaluationId: id });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="iaxcore-${id}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
