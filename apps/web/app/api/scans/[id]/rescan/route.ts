import { NextRequest, NextResponse } from "next/server";
import { hashIp } from "@iaxcore/core";
import { createRateLimitedScan, RateLimitExceededError } from "@iaxcore/db";
import { getClientIp } from "@/lib/clientIp";
import { getDb } from "@/lib/db";
import { triggerInlineWorkerTick } from "@/lib/worker";

// Igual límite que /api/scans/route.ts, por el mismo motivo (runScan +
// t1Detector en serie dentro de after() puede tardar más que el default).
export const maxDuration = 60;

// §10-Fase 4: "Rescan" — repite el escaneo de requestedUrl de una
// evaluación ya completada, enlazando la nueva a la anterior
// (rescanOfEvaluationId) para poder comparar el veredicto T1 de antes y
// después (packages/core/src/rescan.ts). Es literalmente
// createRateLimitedScan con la misma URL/método/páginas que la original —
// pasa por el mismo rate limit que un escaneo nuevo (§9), no hay excepción
// especial para "ya la escaneé antes".
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const original = await db.evaluation.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (original.status !== "completed") {
    return NextResponse.json({ error: "not_completed" }, { status: 400 });
  }

  const requesterIpHash = hashIp(getClientIp(request));
  const DAILY_QUOTA = Number(process.env.SCAN_DAILY_QUOTA ?? 5);

  try {
    const evaluation = await createRateLimitedScan(
      db,
      {
        requestedUrl: original.requestedUrl,
        methodVersion: original.methodVersion,
        pagesRequested: original.pagesRequested,
        requesterIpHash,
        rescanOfEvaluationId: original.id,
      },
      { dailyQuota: DAILY_QUOTA },
    );

    triggerInlineWorkerTick();
    return NextResponse.json({ id: evaluation.id, status: evaluation.status }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "rate_limited", reason: error.reason }, { status: 429 });
    }
    throw error;
  }
}
