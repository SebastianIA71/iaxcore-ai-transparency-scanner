import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { POST } from "./route.js";

const createdIds: string[] = [];

function postRequest(body: unknown, ip = "203.0.113.10") {
  return new NextRequest("http://localhost/api/scans", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

// §9/§10-Fase 1: valida el endpoint real, incluido el rate limiting por IP,
// contra Postgres real — se salta si no hay credenciales.
describe.skipIf(!process.env.DATABASE_POOLED_URL)("POST /api/scans", () => {
  afterEach(async () => {
    if (createdIds.length > 0) {
      const db = getDb();
      await db.scanJob.deleteMany({ where: { evaluationId: { in: createdIds } } });
      await db.evaluation.deleteMany({ where: { id: { in: createdIds } } });
      createdIds.length = 0;
    }
  });

  it("crea una evaluación válida y devuelve 201 con su id", async () => {
    const response = await POST(postRequest({ url: "https://example.com" }, "203.0.113.20"));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("queued");
    createdIds.push(body.id);

    const stored = await getDb().evaluation.findUniqueOrThrow({ where: { id: body.id } });
    expect(stored.pagesRequested).toBe(5);
    const job = await getDb().scanJob.findUnique({ where: { evaluationId: body.id } });
    expect(job).not.toBeNull();
  });

  it("rechaza una URL inválida con 400", async () => {
    const response = await POST(postRequest({ url: "not-a-url" }, "203.0.113.21"));
    expect(response.status).toBe(400);
  });

  it("rechaza un body sin url con 400", async () => {
    const response = await POST(postRequest({}, "203.0.113.22"));
    expect(response.status).toBe(400);
  });

  it("una segunda petición de la misma IP mientras la primera sigue activa da 429", async () => {
    const ip = "203.0.113.23";
    const first = await POST(postRequest({ url: "https://example.com/a" }, ip));
    expect(first.status).toBe(201);
    createdIds.push((await first.json()).id);

    const second = await POST(postRequest({ url: "https://example.com/b" }, ip));
    expect(second.status).toBe(429);
    expect((await second.json()).reason).toBe("concurrent_scan");
  });
});
