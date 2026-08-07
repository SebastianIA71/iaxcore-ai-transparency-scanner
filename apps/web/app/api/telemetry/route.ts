import { recordTelemetryEvent } from "@iaxcore/db";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// §10-Fase 7: "telemetría". Solo para interacciones client-side que no
// pasan por ningún otro endpoint del servidor — a propósito una lista
// cerrada, no un sumidero genérico de eventos arbitrarios.
const ALLOWED_KINDS = new Set(["fix_notice_copied"]);

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
  const { kind } = body as Record<string, unknown>;
  if (typeof kind !== "string" || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const db = getDb();
  await recordTelemetryEvent(db, { kind });

  return NextResponse.json({ ok: true }, { status: 201 });
}
