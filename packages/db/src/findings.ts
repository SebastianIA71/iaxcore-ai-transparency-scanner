import type { Prisma, PrismaClient } from "./generated/prisma/client.js";
import type { AssessmentStatus, EvidenceConfidenceBand, ObservationStatus } from "./generated/prisma/enums.js";

type FindingsDb = Pick<PrismaClient, "finding">;

// §5.1/§15: detectorId es un String, no un enum de Postgres — los ids de T1
// llevan puntos ("t1.channel") y Prisma no admite eso en un enum nativo
// (ver CLAUDE.md, "Detector IDs and a couple of other fields are plain
// strings"). packages/core's zod schema (findingSchema/detectorIdSchema) es
// quien valida la forma en el límite de escritura, no esta capa.
export interface CreateFindingInput {
  evaluationId: string;
  detectorId: string;
  observationStatus: ObservationStatus;
  assessmentStatus?: AssessmentStatus;
  confidenceBand: EvidenceConfidenceBand;
  summaryKey: string;
  detail: Prisma.InputJsonValue;
}

// Un detector produce varios findings a la vez (T1: tres sub-findings +
// t1.assessment) que pertenecen a la misma corrida — createManyAndReturn en
// una sola sentencia evita N round-trips y, a diferencia de createMany, sí
// devuelve los ids que Evidence necesitará más adelante para enlazar cada
// captura a su finding.
export function createFindings(db: FindingsDb, inputs: CreateFindingInput[]) {
  return db.finding.createManyAndReturn({ data: inputs });
}

// Ordenado por id (cuid, generado por el cliente de Prisma en el orden en
// que createFindings() recibió el array — cuid es lexicográficamente
// ordenable por creación) para que quien reconstruya el JSON canónico
// firmado a partir de esta consulta obtenga los findings en el mismo orden
// en que el worker los produjo, sin depender de createdAt (idéntico para
// todas las filas de una misma llamada — no sirve para desempatar).
export function findFindingsByEvaluation(db: FindingsDb, evaluationId: string) {
  return db.finding.findMany({ where: { evaluationId }, orderBy: { id: "asc" } });
}
