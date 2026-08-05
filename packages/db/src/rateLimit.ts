import { Prisma, type PrismaClient } from "./generated/prisma/client.js";
import { createEvaluation, type CreateEvaluationInput } from "./evaluations.js";

type RateLimitDb = Pick<PrismaClient, "evaluation">;

export type RateLimitViolation = "concurrent_scan" | "daily_quota";

// §9: "Rate limiting explícito por IP en POST /api/scans: cuota diaria +
// concurrencia máxima de 1 escaneo por IP. Requisito testeable, no solo
// implícito en 'límites'."
export class RateLimitExceededError extends Error {
  constructor(public readonly reason: RateLimitViolation) {
    super(`rate limit exceeded: ${reason}`);
    this.name = "RateLimitExceededError";
  }
}

export interface RateLimitConfig {
  dailyQuota: number;
}

export async function assertWithinRateLimit(
  db: RateLimitDb,
  requesterIpHash: string,
  config: RateLimitConfig,
): Promise<void> {
  const concurrent = await db.evaluation.count({
    where: { requesterIpHash, status: { in: ["queued", "running"] } },
  });
  if (concurrent > 0) {
    throw new RateLimitExceededError("concurrent_scan");
  }

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  const dailyCount = await db.evaluation.count({
    where: { requesterIpHash, createdAt: { gte: startOfDayUtc } },
  });
  if (dailyCount >= config.dailyQuota) {
    throw new RateLimitExceededError("daily_quota");
  }
}

// assertWithinRateLimit por sí solo tiene una carrera TOCTOU: dos requests
// de la misma IP pueden pasar el chequeo antes de que ninguna haya
// insertado. El índice único parcial "evaluations_one_active_per_ip"
// (ver schema.prisma) la cierra a nivel de DB — aquí se traduce esa
// violación (P2002) al mismo RateLimitExceededError para que el caller no
// tenga que conocer el detalle de Prisma.
//
// Crea la Evaluation y su ScanJob en la misma transacción: si el caller
// hiciera esto en dos pasos sueltos y el segundo fallara, quedaría una
// Evaluation "queued" sin job — nunca la recogería el worker, y seguiría
// ocupando el cupo de concurrencia de esa IP para siempre.
export async function createRateLimitedScan(
  db: PrismaClient,
  input: CreateEvaluationInput,
  config: RateLimitConfig,
) {
  await assertWithinRateLimit(db, input.requesterIpHash, config);
  try {
    return await db.$transaction(async (tx) => {
      const evaluation = await createEvaluation(tx, input);
      await tx.scanJob.create({ data: { evaluationId: evaluation.id } });
      return evaluation;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new RateLimitExceededError("concurrent_scan");
    }
    throw error;
  }
}
