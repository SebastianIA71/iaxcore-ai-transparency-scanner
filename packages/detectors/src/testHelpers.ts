import type { Server } from "node:http";

// Duplicado deliberado de packages/scanner/src/testHelpers.ts: ese helper
// no forma parte de la superficie pública de @iaxcore/scanner (no se
// exporta desde su index.ts), así que un test de otro paquete no debería
// alcanzarlo por una ruta relativa dentro de src/ ajeno. checkUrl() (§9)
// solo permite puerto 80/443/ninguno, así que t1Detector.test.ts también
// necesita un servidor real en el 80, y Vitest ejecuta los ficheros de
// distintos paquetes en procesos separados, así que el reintento con
// backoff evita el mismo EADDRINUSE que ya se vio en packages/scanner.
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
