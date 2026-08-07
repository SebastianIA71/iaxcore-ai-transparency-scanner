import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createShareLink, resolveShareLink, revokeShareLink, touchShareLinkAccess } from "./shareLinks.js";

type FakeDb = Pick<PrismaClient, "shareLink">;

function hashOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function fakeDb(overrides: Partial<{ findUnique: unknown }> = {}): FakeDb {
  return {
    shareLink: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "share_1", ...args.data })),
      findUnique: overrides.findUnique ?? vi.fn(async () => null),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: args.where.id,
        ...args.data,
      })),
    },
  } as unknown as FakeDb;
}

describe("createShareLink — §9: solo se guarda el hash del token, nunca el token en claro", () => {
  it("genera un token, guarda su hash, y devuelve el token en claro una sola vez", async () => {
    const db = fakeDb();
    const expiresAt = new Date("2026-09-01T00:00:00.000Z");

    const result = await createShareLink(db, { reportArtifactId: "artifact_1", expiresAt });

    expect(result.token).toBeTruthy();
    expect(db.shareLink.create).toHaveBeenCalledWith({
      data: { reportArtifactId: "artifact_1", tokenHash: hashOf(result.token), expiresAt },
    });
    // El propio hash nunca debería coincidir con el token en claro.
    expect(hashOf(result.token)).not.toBe(result.token);
  });
});

describe("resolveShareLink", () => {
  it("devuelve null si el token no existe", async () => {
    const db = fakeDb({ findUnique: vi.fn(async () => null) });
    expect(await resolveShareLink(db, "no-such-token")).toBeNull();
  });

  it("devuelve null si está revocado", async () => {
    const db = fakeDb({
      findUnique: vi.fn(async () => ({
        id: "share_1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10_000),
      })),
    });
    expect(await resolveShareLink(db, "token")).toBeNull();
  });

  it("devuelve null si ya caducó", async () => {
    const db = fakeDb({
      findUnique: vi.fn(async () => ({
        id: "share_1",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 10_000),
      })),
    });
    expect(await resolveShareLink(db, "token")).toBeNull();
  });

  it("devuelve el share link si es válido y no ha caducado", async () => {
    const shareLink = { id: "share_1", revokedAt: null, expiresAt: new Date(Date.now() + 10_000) };
    const db = fakeDb({ findUnique: vi.fn(async () => shareLink) });
    expect(await resolveShareLink(db, "token")).toEqual(shareLink);
  });
});

describe("revokeShareLink / touchShareLinkAccess", () => {
  it("revokeShareLink marca revokedAt", async () => {
    const db = fakeDb();
    await revokeShareLink(db, "share_1");
    expect(db.shareLink.update).toHaveBeenCalledWith({
      where: { id: "share_1" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("touchShareLinkAccess marca lastAccessedAt sin tocar revokedAt", async () => {
    const db = fakeDb();
    await touchShareLinkAccess(db, "share_1");
    expect(db.shareLink.update).toHaveBeenCalledWith({
      where: { id: "share_1" },
      data: { lastAccessedAt: expect.any(Date) },
    });
  });
});
