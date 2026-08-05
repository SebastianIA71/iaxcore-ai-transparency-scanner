import { createPooledClient, type PrismaClient } from "@iaxcore/db";

// Singleton por proceso — evita agotar el pool de conexiones re-creando un
// PrismaClient (y su Pool de pg) en cada invocación de una función serverless
// cálida, y evita el mismo problema en hot-reload de `next dev`.
let client: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!client) {
    client = createPooledClient();
  }
  return client;
}
