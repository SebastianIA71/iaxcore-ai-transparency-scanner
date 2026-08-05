import { createServer, type Server } from "node:http";
import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSecureContext, installSsrfGuard, launchSecureBrowser } from "./browser.js";

// fake-public.test no existe de verdad — se resuelve a 127.0.0.1 vía
// --host-resolver-rules SOLO para este proceso de Chromium, así que el
// navegador conecta de verdad con el servidor local de abajo, mientras que
// el resolveHostname inyectado en el guard (que es lógica NUESTRA, no de
// Chromium) le hace creer que la IP es pública y pasa la comprobación SSRF.
// El servidor escucha en el puerto 80 (el por defecto de http://, así que
// checkUrl() no lo rechaza por "disallowed_port"). Se navega a una página
// real de ese origen (no a data:) y se hace fetch() desde ahí — Chromium
// bloquea fetch() iniciado desde un documento data: a nivel de red, antes
// incluso de CORS (verificado aparte, sin el guard de por medio).
const FAKE_PUBLIC_HOSTNAME = "fake-public.test";
const FAKE_PUBLIC_IP = "93.184.216.34";
const ORIGIN = `http://${FAKE_PUBLIC_HOSTNAME}`;

describe("installSsrfGuard — límites de tamaño y redirecciones (§9)", () => {
  let server: Server;
  let browser: Browser;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = req.url ?? "/";
      if (url === "/") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html></html>");
        return;
      }
      if (url === "/small") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("ok");
        return;
      }
      if (url === "/large") {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end(Buffer.alloc(10_000, "x"));
        return;
      }
      const redirectMatch = url.match(/^\/redirect\/(\d+)$/);
      if (redirectMatch) {
        const step = Number(redirectMatch[1]);
        if (step <= 0) {
          res.writeHead(200, { "content-type": "text/plain" });
          res.end("final");
          return;
        }
        res.writeHead(302, { location: `/redirect/${step - 1}` });
        res.end();
        return;
      }
      if (url === "/redirect-to-loopback") {
        // Un origen que el guard ya aprobó (por resolveHostname inyectado)
        // redirige a una IP literal genuinamente bloqueada — el caso real
        // que reveló que route() no vuelve a comprobar los saltos.
        res.writeHead(302, { location: "http://127.0.0.1/landed" });
        res.end();
        return;
      }
      if (url === "/landed") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("no deberías poder leer esto");
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(80, "127.0.0.1", resolve);
    });

    browser = await launchSecureBrowser([`--host-resolver-rules=MAP ${FAKE_PUBLIC_HOSTNAME} 127.0.0.1`]);
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function fetchThrough(path: string, limits?: Partial<import("./browser.js").SsrfGuardLimits>) {
    const context = await createSecureContext(browser);
    const state = installSsrfGuard(context, {
      limits: {
        maxRequests: 200,
        maxRedirects: 5,
        maxResourceBytes: 10 * 1024 * 1024,
        maxTotalBytes: 50 * 1024 * 1024,
        ...limits,
      },
      resolveHostname: async () => FAKE_PUBLIC_IP,
    });
    const page = await context.newPage();
    try {
      await page.goto(ORIGIN); // navegación real, ya pasa por el guard también
      await page.evaluate((relativePath) => fetch(relativePath).catch(() => {}), path);
      await page.waitForTimeout(300);
    } catch {
      // Una violación detectada a mitad de una redirección cierra el
      // contexto entero (ver browser.ts) — eso corta en seco cualquier
      // page.evaluate()/goto() en vuelo. Es el resultado esperado, no un
      // fallo del test.
    }
    await context.close().catch(() => {});
    return state;
  }

  it("deja pasar un recurso por debajo del límite y suma su tamaño a totalBytes", async () => {
    const state = await fetchThrough("/small");
    expect(state.blocked).toHaveLength(0);
    expect(state.totalBytes).toBeGreaterThan(0);
  });

  it("bloquea un recurso que supera maxResourceBytes, sin afectar a la navegación previa", async () => {
    const state = await fetchThrough("/large", { maxResourceBytes: 100 });
    expect(state.blocked).toEqual([{ url: `${ORIGIN}/large`, reason: "resource_size_limit" }]);
  });

  it("bloquea cuando el acumulado total supera maxTotalBytes", async () => {
    const state = await fetchThrough("/small", { maxTotalBytes: 1 });
    expect(state.blocked.length).toBeGreaterThan(0);
    expect(state.blocked.every((b) => b.reason === "total_size_limit")).toBe(true);
  });

  it("sigue una cadena de redirecciones corta sin problema", async () => {
    const state = await fetchThrough("/redirect/2", { maxRedirects: 5 });
    expect(state.blocked).toHaveLength(0);
  });

  it("corta una cadena de redirecciones que supera maxRedirects", async () => {
    const state = await fetchThrough("/redirect/6", { maxRedirects: 2 });
    expect(state.blocked.some((b) => b.reason === "redirect_limit")).toBe(true);
  });

  it("detecta y mata el contexto cuando una redirección aterriza en una IP bloqueada de verdad", async () => {
    const state = await fetchThrough("/redirect-to-loopback");
    expect(state.blocked).toEqual([{ url: "http://127.0.0.1/landed", reason: "loopback" }]);
  });
});
