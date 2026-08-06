import { after, NextRequest, NextResponse } from "next/server";
import { hashIp } from "@iaxcore/core";
import { createRateLimitedScan, RateLimitExceededError } from "@iaxcore/db";
import { runWorkerOnce } from "@iaxcore/pipeline";
import { getDb } from "@/lib/db";

// Por defecto Vercel corta una función bastante antes de lo que permite el
// plan — hay que pedirlo explícitamente. runScan() (hasta 5 páginas) +
// t1Detector (una navegación más aparte) corriendo en serie dentro de
// after() pueden tardar bastante más que el límite por defecto contra un
// sitio lento; Hobby permite hasta 300s, esto se queda con margen de sobra
// sin acercarse a ese techo.
export const maxDuration = 60;

// Vercel Hobby no permite cron con la frecuencia que haría falta para
// procesar la cola por sondeo (mínimo 1 vez/día — inútil para un scan que
// debería completarse en segundos). En su lugar, esta misma función
// procesa el job que acaba de crear, dentro de after() (sigue viva tras
// responder, sin retrasar lo que ve quien escanea). apps/worker's poll
// loop sigue siendo el camino real si algún día hay un proceso persistente
// en otro sitio (Railway, Fly.io, una VM…) — ambos llaman a la misma
// runWorkerOnce(), así que da igual cuál procese un job concreto.
function triggerInlineWorkerTick(): void {
  const signingKeyId = process.env.SIGNING_KEY_ID;
  const signingPrivateKeyBase64 = process.env.SIGNING_PRIVATE_KEY_B64;
  if (!signingKeyId || !signingPrivateKeyBase64) {
    console.warn("SIGNING_KEY_ID/SIGNING_PRIVATE_KEY_B64 not set — scan will stay queued until a worker picks it up");
    return;
  }
  after(() =>
    runWorkerOnce(getDb(), { workerId: "vercel-inline", signingKeyId, signingPrivateKeyBase64 }).catch((error) => {
      console.error("inline worker tick failed", error);
    }),
  );
}

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

    triggerInlineWorkerTick();
    return NextResponse.json({ id: evaluation.id, status: evaluation.status }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: "rate_limited", reason: error.reason }, { status: 429 });
    }
    throw error;
  }
}
