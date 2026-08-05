import { NextRequest, NextResponse } from "next/server";
import { hashIp } from "@iaxcore/core";
import { createRateLimitedScan, RateLimitExceededError } from "@iaxcore/db";
import { getDb } from "@/lib/db";

const METHOD_VERSION = "iaxcore-ai-transparency@0.1.0";
// §10-Fase 2: "selección determinista de hasta cinco páginas".
const MAX_PAGES_PER_SCAN = 5;
const DAILY_QUOTA = Number(process.env.SCAN_DAILY_QUOTA ?? 5);

function getClientIp(request: NextRequest): string {
  // Vercel y la mayoría de proxies anteponen el cliente real en x-forwarded-for.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isValidPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// §9: SSRF completo (localhost, redes privadas, metadata cloud...) es un
// entregable de Fase 2 a nivel de crawler — aquí solo se rechaza lo que es
// sintácticamente inválido como URL pública, no se sustituye esa validación.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const url = typeof body === "object" && body !== null && "url" in body ? (body as { url: unknown }).url : null;
  if (typeof url !== "string" || !isValidPublicUrl(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const requesterIpHash = hashIp(getClientIp(request));

  try {
    const evaluation = await createRateLimitedScan(
      getDb(),
      {
        requestedUrl: url,
        methodVersion: METHOD_VERSION,
        pagesRequested: MAX_PAGES_PER_SCAN,
        requesterIpHash,
      },
      { dailyQuota: DAILY_QUOTA },
    );

    return NextResponse.json({ id: evaluation.id, status: evaluation.status }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "rate_limited", reason: error.reason }, { status: 429 });
    }
    throw error;
  }
}
