import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { GET } from "./route.js";

describe.skipIf(!process.env.DATABASE_POOLED_URL)("GET /api/scans/[id]", () => {
  let evaluationId: string;

  beforeAll(async () => {
    const db = getDb();
    const evaluation = await db.evaluation.create({
      data: {
        requestedUrl: "https://example.com",
        methodVersion: "iaxcore-ai-transparency@0.1.0",
        pagesRequested: 5,
        requesterIpHash: "route-get-test-ip-hash",
      },
    });
    evaluationId = evaluation.id;
  });

  afterAll(async () => {
    await getDb().evaluation.delete({ where: { id: evaluationId } });
  });

  it("devuelve el estado público de una evaluación existente", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/scans/${evaluationId}`), {
      params: Promise.resolve({ id: evaluationId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: evaluationId, status: "queued", requestedUrl: "https://example.com" });
  });

  it("devuelve 404 para un id que no existe", async () => {
    const response = await GET(new NextRequest("http://localhost/api/scans/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});
