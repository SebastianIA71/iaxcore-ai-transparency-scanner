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
