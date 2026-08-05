import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export type { PrismaClient } from "./generated/prisma/client.js";
export * from "./generated/prisma/enums.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

// apps/web: consultas simples, seguras contra pgbouncer en modo transacción.
export function createPooledClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: requireEnv("DATABASE_POOLED_URL") }) });
}

// apps/worker: el polling SKIP LOCKED (queue.ts) necesita una sesión
// persistente entre statements, que pgbouncer en modo transacción no sostiene.
export function createDirectClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: requireEnv("DATABASE_URL") }) });
}
