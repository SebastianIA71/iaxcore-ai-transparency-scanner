import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSecureContext, installSsrfGuard, launchSecureBrowser } from "./browser.js";

// Requiere Chromium instalado (`npx playwright install chromium`). No se
// salta si falta — a diferencia de los *.integration.test.ts (que dependen
// de credenciales de Supabase), esto es una dependencia de desarrollo
// esperada del propio paquete, igual que tener Node instalado.
let browser: Browser;

beforeAll(async () => {
  browser = await launchSecureBrowser();
});

afterAll(async () => {
  await browser.close();
});

// Fetch dentro de la página, no navegación — así se prueba exactamente lo
// que pide §9 ("no solo la URL principal, también un script o imagen"), y
// no hace falta un servidor real para los casos bloqueados: el guard aborta
// la request en base a la IP inyectada por resolveHostname, sin que
// Playwright llegue a intentar una conexión real.
async function attemptFetch(browserInstance: Browser, url: string, resolveHostname?: (host: string) => Promise<string>) {
  const context = await createSecureContext(browserInstance);
  const state = installSsrfGuard(context, resolveHostname ? { resolveHostname } : {});
  const page = await context.newPage();
  await page.goto("data:text/html,<html></html>");
  await page.evaluate((target) => fetch(target).catch(() => {}), url);
  await context.close();
  return state;
}

describe("installSsrfGuard — intercepta todo, no solo la navegación principal (§9)", () => {
  it("F18: bloquea una request hacia la IP de metadata cloud", async () => {
    const state = await attemptFetch(browser, "http://internal-service.test/meta-data", async () => "169.254.169.254");
    expect(state.blocked).toHaveLength(1);
    expect(state.blocked[0]).toMatchObject({ reason: "cloud_metadata" });
  });

  it("F17: bloquea una request que resuelve a loopback (simula el destino de una redirección a localhost)", async () => {
    const state = await attemptFetch(browser, "http://internal-service.test/", async () => "127.0.0.1");
    expect(state.blocked).toHaveLength(1);
    expect(state.blocked[0]).toMatchObject({ reason: "loopback" });
  });

  it("bloquea una request hacia un rango privado RFC1918 (DNS rebinding: el hostname parece externo, la IP resuelta no)", async () => {
    const state = await attemptFetch(browser, "http://looks-external.test/", async () => "10.1.2.3");
    expect(state.blocked).toHaveLength(1);
    expect(state.blocked[0]).toMatchObject({ reason: "private_range" });
  });

  it("bloquea por protocolo/puerto antes de siquiera intentar resolver DNS", async () => {
    const state = await attemptFetch(browser, "http://internal-service.test:8080/", async () => {
      throw new Error("no debería llegar a resolver — el puerto ya lo descarta");
    });
    expect(state.blocked).toHaveLength(1);
    expect(state.blocked[0]).toMatchObject({ reason: "disallowed_port" });
  });

  it("permite una request pública real y deja pasar la respuesta", async () => {
    const state = await attemptFetch(browser, "https://raw.githubusercontent.com/robots.txt");
    expect(state.blocked).toHaveLength(0);
    expect(state.requestCount).toBe(1);
  });

  it("corta en request_limit cuando se supera el máximo configurado", async () => {
    // El contador se incrementa antes de resolver/clasificar la IP (ver
    // browser.ts), así que el límite aplica independientemente de si la
    // dirección en sí habría pasado o no.
    const context = await createSecureContext(browser);
    const state = installSsrfGuard(context, {
      limits: { maxRequests: 1 },
      resolveHostname: async () => "10.0.0.1",
    });
    const page = await context.newPage();
    await page.goto("data:text/html,<html></html>");
    await page.evaluate(() => {
      fetch("http://a.test/").catch(() => {});
      fetch("http://b.test/").catch(() => {});
    });
    await page.waitForTimeout(200);
    await context.close();

    // Primera request: pasa el límite (1 ≤ 1), la bloquea la clasificación
    // de IP. Segunda: ni llega a resolver, la corta el límite directamente.
    expect(state.blocked.map((b) => b.reason).sort()).toEqual(["private_range", "request_limit"]);
  });
});
