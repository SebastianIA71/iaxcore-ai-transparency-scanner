import type { Prisma, PrismaClient } from "./generated/prisma/client.js";

type TelemetryDb = Pick<PrismaClient, "telemetryEvent">;

// §10-Fase 7: "telemetría" — solo para las interacciones que ninguna otra
// tabla ya registra (ver el comentario del modelo en schema.prisma).
// `evaluationId` deliberadamente no se valida contra Evaluation aquí: no hay
// FK, así que un ID inválido (p. ej. un intento de /verify con un id que no
// existe) sigue quedando registrado en vez de fallar.
export interface RecordTelemetryEventInput {
  kind: string;
  evaluationId?: string;
  metadata?: Prisma.InputJsonValue;
}

export function recordTelemetryEvent(db: TelemetryDb, input: RecordTelemetryEventInput) {
  return db.telemetryEvent.create({
    data: {
      kind: input.kind,
      evaluationId: input.evaluationId,
      metadata: input.metadata ?? {},
    },
  });
}

export interface TelemetryKindCount {
  kind: string;
  count: number;
}

// Panel interno (§10-Fase 7): recuento por tipo de evento, sin rango de
// fechas — el piloto no tiene volumen suficiente para necesitar paginar ni
// acotar por periodo todavía.
export async function countTelemetryEventsByKind(db: TelemetryDb): Promise<TelemetryKindCount[]> {
  const rows = await db.telemetryEvent.groupBy({
    by: ["kind"],
    _count: { _all: true },
  });
  return rows.map((row) => ({ kind: row.kind, count: row._count._all }));
}
