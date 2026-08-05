import type { Prisma, PrismaClient } from "./generated/prisma/client.js";

type EvaluationsDb = Pick<PrismaClient, "evaluation">;

export interface CreateEvaluationInput {
  requestedUrl: string;
  methodVersion: string;
  pagesRequested: number;
  requesterIpHash: string;
}

export interface CompleteEvaluationInput {
  finalUrl: string;
  pagesAnalyzed: number;
  manifest: Prisma.InputJsonValue;
  reportHash: string;
  signatureId: string;
}

// §7/§10-Fase 1: "una evaluación simulada pasa queued → running → completed,
// no puede alterarse". Cada transición es una escritura condicional sobre el
// estado actual (updateMany + where.status) para que dos workers que se
// disputan el mismo job, o un intento de reescribir una evaluación ya
// completada/failed, no puedan pisarse — la segunda escritura no encuentra
// filas que igualen el where y falla explícitamente en vez de sobrescribir.
export class ImmutableEvaluationTransitionError extends Error {
  constructor(
    public readonly evaluationId: string,
    public readonly attemptedTransition: string,
  ) {
    super(
      `evaluation ${evaluationId}: cannot ${attemptedTransition} — it is not in the expected prior state (already transitioned, or does not exist)`,
    );
    this.name = "ImmutableEvaluationTransitionError";
  }
}

export function createEvaluation(db: EvaluationsDb, input: CreateEvaluationInput) {
  return db.evaluation.create({
    data: {
      requestedUrl: input.requestedUrl,
      methodVersion: input.methodVersion,
      pagesRequested: input.pagesRequested,
      requesterIpHash: input.requesterIpHash,
      status: "queued",
      pagesAnalyzed: 0,
      manifest: {},
    },
  });
}

export async function markEvaluationRunning(db: EvaluationsDb, evaluationId: string): Promise<void> {
  const { count } = await db.evaluation.updateMany({
    where: { id: evaluationId, status: "queued" },
    data: { status: "running" },
  });
  if (count === 0) {
    throw new ImmutableEvaluationTransitionError(evaluationId, "transition to running");
  }
}

export async function completeEvaluation(
  db: EvaluationsDb,
  evaluationId: string,
  input: CompleteEvaluationInput,
): Promise<void> {
  const { count } = await db.evaluation.updateMany({
    where: { id: evaluationId, status: "running" },
    data: {
      status: "completed",
      completedAt: new Date(),
      finalUrl: input.finalUrl,
      pagesAnalyzed: input.pagesAnalyzed,
      manifest: input.manifest,
      reportHash: input.reportHash,
      signatureId: input.signatureId,
    },
  });
  if (count === 0) {
    throw new ImmutableEvaluationTransitionError(evaluationId, "complete");
  }
}

// El detalle del error vive en ScanJob.lastError (§15), no aquí — Evaluation
// solo registra que falló, para no arriesgar sobrescribir manifest con un
// updateMany que no puede fusionar JSON de forma atómica.
export async function failEvaluation(db: EvaluationsDb, evaluationId: string): Promise<void> {
  const { count } = await db.evaluation.updateMany({
    where: { id: evaluationId, status: { in: ["queued", "running"] } },
    data: {
      status: "failed",
      completedAt: new Date(),
    },
  });
  if (count === 0) {
    throw new ImmutableEvaluationTransitionError(evaluationId, "fail");
  }
}
