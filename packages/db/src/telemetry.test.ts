import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { countTelemetryEventsByKind, recordTelemetryEvent } from "./telemetry.js";

type FakeTelemetryDb = Pick<PrismaClient, "telemetryEvent">;

function fakeDb(groupByResult: Array<{ kind: string; _count: { _all: number } }> = []): FakeTelemetryDb {
  return {
    telemetryEvent: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "evt_1", ...args.data })),
      groupBy: vi.fn(async () => groupByResult),
    },
  } as unknown as FakeTelemetryDb;
}

describe("recordTelemetryEvent — §10-Fase 7: telemetría", () => {
  it("guarda kind, evaluationId opcional y metadata (por defecto {})", async () => {
    const db = fakeDb();

    await recordTelemetryEvent(db, { kind: "verify_checked", evaluationId: "eval_1" });

    expect(db.telemetryEvent.create).toHaveBeenCalledWith({
      data: { kind: "verify_checked", evaluationId: "eval_1", metadata: {} },
    });
  });

  it("acepta un evaluationId inválido sin lanzar — no hay FK a Evaluation a propósito", async () => {
    const db = fakeDb();

    await expect(
      recordTelemetryEvent(db, { kind: "verify_checked", evaluationId: "no-existe" }),
    ).resolves.toBeTruthy();
  });
});

describe("countTelemetryEventsByKind", () => {
  it("agrupa por kind y devuelve el recuento de cada uno", async () => {
    const db = fakeDb([
      { kind: "verify_checked", _count: { _all: 3 } },
      { kind: "pdf_downloaded", _count: { _all: 1 } },
    ]);

    const result = await countTelemetryEventsByKind(db);

    expect(result).toEqual([
      { kind: "verify_checked", count: 3 },
      { kind: "pdf_downloaded", count: 1 },
    ]);
  });
});
