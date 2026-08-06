import type { Prisma, PrismaClient } from "./generated/prisma/client.js";

type LeadsDb = Pick<PrismaClient, "lead">;

// §7/§10-Fase 7: "capturar la única señal que falta en todo el diseño:
// disposición a pagar" — el desbloqueo del "expediente completo" es un
// botón de intención, no una pasarela de pago (§10-Fase 7: "cobro manual o
// enlace de pago externo — no se construye pasarela de pago"). `Lead` es
// deliberadamente independiente del informe (§15): capturar un email no
// debe poder alterar ni una Evaluation ni su firma.
export interface CreateLeadInput {
  email: string;
  evaluationId: string;
  consent: Prisma.InputJsonValue;
  priceInterestClicked: boolean;
}

export function createLead(db: LeadsDb, input: CreateLeadInput) {
  return db.lead.create({ data: input });
}
