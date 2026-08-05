import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "./generated/prisma/client.js";

type ShareLinksDb = Pick<PrismaClient, "shareLink">;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateShareLinkInput {
  reportArtifactId: string;
  expiresAt: Date;
}

export interface CreatedShareLink {
  id: string;
  // Texto plano — se devuelve una única vez, aquí; la base solo guarda su hash (§9).
  token: string;
}

export async function createShareLink(db: ShareLinksDb, input: CreateShareLinkInput): Promise<CreatedShareLink> {
  const token = randomBytes(32).toString("base64url");
  const shareLink = await db.shareLink.create({
    data: {
      reportArtifactId: input.reportArtifactId,
      tokenHash: hashToken(token),
      expiresAt: input.expiresAt,
    },
  });
  return { id: shareLink.id, token };
}

export async function resolveShareLink(db: ShareLinksDb, token: string) {
  const shareLink = await db.shareLink.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!shareLink || shareLink.revokedAt || shareLink.expiresAt < new Date()) {
    return null;
  }
  return shareLink;
}

export async function revokeShareLink(db: ShareLinksDb, id: string): Promise<void> {
  await db.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
}
