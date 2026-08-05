import type { Server } from "node:http";

// Varios ficheros de test necesitan un servidor real en el puerto 80 —
// checkUrl() (§9) solo permite puerto 80/443/ninguno, así que no hay forma
// de probar una navegación permitida de principio a fin con un puerto
// efímero. Vitest ejecuta los ficheros en paralelo, así que dos suites que
// hagan listen(80) al mismo tiempo chocan con EADDRINUSE — este helper
// reintenta con backoff hasta que el puerto quede libre, en vez de asumir
// que este fichero es el único que lo usa.
export async function listenOnPort80(server: Server): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => {
          server.removeListener("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.removeListener("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(80, "127.0.0.1");
      });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("No se pudo bindear el puerto 80 tras varios reintentos");
}
