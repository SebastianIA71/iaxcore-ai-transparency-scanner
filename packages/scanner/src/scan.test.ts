import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runScan } from "./scan.js";
import { listenOnPort80 } from "./testHelpers.js";

// Mismo truco que browser.limits.test.ts: un hostname que no es una IP
// literal (así que checkUrl() no lo rechaza de entrada) resuelto a
// 127.0.0.1 solo para este proceso de Chromium vía --host-resolver-rules,
// mientras que el resolveHostname inyectado en el guard le hace creer al
// SSRF guard que la IP es pública. checkUrl() exige puerto 80/443/ninguno,
// así que el servidor local tiene que escuchar de verdad en el 80 — otro
// fichero de test (browser.limits.test.ts) también lo hace, así que el
// listen() reintenta si el puerto está momentáneamente ocupado por el otro.
const FAKE_PUBLIC_HOSTNAME = "iaxcore-scan-test.test";
const FAKE_PUBLIC_IP = "93.184.216.34";
const ORIGIN = `http://${FAKE_PUBLIC_HOSTNAME}`;
const resolveHostname = async () => FAKE_PUBLIC_IP;

const PAGES: Record<string, { status: number; body: string; contentType?: string }> = {
  "/": {
    status: 200,
    body: `<html><body>
      <img src="http://blocked-secondary.test/pixel.png" />
      <a href="/child-a">A</a>
      <a href="/child-b">B</a>
      <a href="/missing">Falla al cargar</a>
      <a href="/disallowed">Bloqueada por robots.txt</a>
    </body></html>`,
  },
  "/child-a": { status: 200, body: "<html><body>A</body></html>" },
  "/child-b": { status: 200, body: "<html><body>B</body></html>" },
  "/missing": { status: 404, body: "not found" },
  "/disallowed": { status: 200, body: "<html><body>No deberías llegar aquí</body></html>" },
  "/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /disallowed\n", contentType: "text/plain" },
};

describe("runScan — §10-Fase 2: orquestación de principio a fin", () => {
  let server: Server;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const entry = PAGES[req.url ?? "/"];
      if (!entry) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(entry.status, { "content-type": entry.contentType ?? "text/html" });
      res.end(entry.body);
    });
    await listenOnPort80(server);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("recorre las páginas seleccionadas, respeta robots.txt y registra causa de cada exclusión", async () => {
    const result = await runScan(ORIGIN, {
      resolveHostname,
      launchArgs: [`--host-resolver-rules=MAP ${FAKE_PUBLIC_HOSTNAME} 127.0.0.1`],
    });

    const byUrl = new Map(result.manifest.pages.map((p) => [p.url, p]));
    expect(byUrl.get(`${ORIGIN}/`)).toMatchObject({ status: "completed" });
    expect(byUrl.get(`${ORIGIN}/child-a`)).toMatchObject({ status: "completed" });
    expect(byUrl.get(`${ORIGIN}/child-b`)).toMatchObject({ status: "completed" });
    expect(byUrl.get(`${ORIGIN}/missing`)).toMatchObject({
      status: "excluded",
      exclusionReason: "http_error",
      httpStatus: 404,
    });

    // /disallowed nunca se selecciona (robots.txt real, obtenido por el
    // propio runScan) — no aparece ni como completada ni como excluida.
    expect(byUrl.has(`${ORIGIN}/disallowed`)).toBe(false);

    expect(result.pagesAnalyzed).toBe(3);
    expect(result.pagesRequested).toBe(result.manifest.pages.length);
    expect(result.finalUrl).toBe(`${ORIGIN}/`);
  }, 30_000);

  it("bloquea de entrada una URL inicial que ya viola SSRF, sin abrir navegador", async () => {
    const result = await runScan("http://127.0.0.1/");

    expect(result.pagesRequested).toBe(1);
    expect(result.pagesAnalyzed).toBe(0);
    expect(result.manifest.pages).toEqual([
      { url: "http://127.0.0.1/", status: "excluded", exclusionReason: "loopback" },
    ]);
    expect(result.manifest.consent_interaction).toBe("not_attempted");
  });

  it("registra en blocked_requests un recurso secundario (<img>) que apunta a una IP bloqueada, sin tumbar la página", async () => {
    // §9: "una imagen o script también puede intentar acceder a servicios
    // internos" — la página base de arriba incluye un <img> hacia un
    // hostname que este resolver hace parecer una IP privada. La request
    // de la imagen se aborta; la navegación en sí no se ve afectada.
    const branchingResolver = async (hostname: string) =>
      hostname === "blocked-secondary.test" ? "10.0.0.5" : FAKE_PUBLIC_IP;

    const result = await runScan(ORIGIN, {
      resolveHostname: branchingResolver,
      launchArgs: [`--host-resolver-rules=MAP ${FAKE_PUBLIC_HOSTNAME} 127.0.0.1`],
      maxPages: 1,
    });

    expect(result.manifest.pages[0]).toMatchObject({ url: `${ORIGIN}/`, status: "completed" });
    expect(result.manifest.blocked_requests).toContainEqual({
      url: "http://blocked-secondary.test/pixel.png",
      reason: "private_range",
    });
  }, 30_000);
});
