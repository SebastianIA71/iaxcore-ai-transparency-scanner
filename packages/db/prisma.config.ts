import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Un único .env vive en la raíz del monorepo (ver .env.example) — el CLI de
// Prisma se ejecuta desde packages/db, así que hay que apuntarlo ahí.
loadEnv({ path: path.resolve(import.meta.dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // migrate/introspect necesitan una sesión persistente que pgbouncer en
    // modo transacción (DATABASE_POOLED_URL) no sostiene — usar la directa.
    url: env("DATABASE_URL"),
  },
});
