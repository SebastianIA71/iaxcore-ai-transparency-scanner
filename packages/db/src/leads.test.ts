import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createLead } from "./leads.js";

type FakeLeadsDb = Pick<PrismaClient, "lead">;

function fakeDb(): FakeLeadsDb {
  return {
    lead: { create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "lead_1", ...args.data })) },
  } as unknown as FakeLeadsDb;
}

describe("createLead — §10-Fase 7: captura del botón de intención de precio", () => {
  it("inserta el lead con los campos dados", async () => {
    const db = fakeDb();
    const input = {
      email: "persona@example.com",
      evaluationId: "eval_1",
      consent: { contactConsent: true },
      priceInterestClicked: true,
    };

    const lead = await createLead(db, input);

    expect(db.lead.create).toHaveBeenCalledWith({ data: input });
    expect(lead).toMatchObject({ id: "lead_1", email: "persona@example.com" });
  });
});
