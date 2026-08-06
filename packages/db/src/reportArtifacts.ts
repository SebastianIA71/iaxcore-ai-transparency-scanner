import type { PrismaClient } from "./generated/prisma/client.js";

type ReportArtifactsDb = Pick<PrismaClient, "reportArtifact">;

export interface CreateReportArtifactInput {
  evaluationId: string;
  format: "json" | "pdf";
  canonicalHash: string;
  // §8: "El PDF no lleva firma propia" — signature/keyId solo aplican a format "json".
  signature?: string;
  keyId?: string;
}

export function createReportArtifact(db: ReportArtifactsDb, input: CreateReportArtifactInput) {
  return db.reportArtifact.create({ data: input });
}

// §14/§8: "/verify acepta evaluation_id (verificación por servidor,
// piloto)". Un ReportArtifact por Evaluation en la práctica (una sola
// llamada a createReportArtifact por evaluación completada), pero nada lo
// impone a nivel de schema — el más reciente es el que corresponde al
// estado actual de la Evaluation, así que se ordena por createdAt.
export function findLatestReportArtifact(db: ReportArtifactsDb, evaluationId: string) {
  return db.reportArtifact.findFirst({ where: { evaluationId }, orderBy: { createdAt: "desc" } });
}
