import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Browser, BrowserContext, Page } from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSecureContext, launchSecureBrowser } from "./browser.js";
import { handleConsentBanner } from "./consentBanner.js";

const PAGES: Record<string, string> = {
  "/known-cmp": `<html><body>
    <div id="onetrust-banner-sdk">
      <button id="onetrust-accept-btn-handler">Accept All Cookies</button>
    </div>
    <p data-testid="clicked-marker">not-clicked</p>
    <script>document.getElementById('onetrust-accept-btn-handler').addEventListener('click', () => {
      document.querySelector('[data-testid="clicked-marker"]').textContent = 'clicked';
    });</script>
  </body></html>`,
  "/text-fallback": `<html><body>
    <div class="cookie-banner">
      <button>Aceptar todas</button>
    </div>
    <p data-testid="clicked-marker">not-clicked</p>
    <script>document.querySelector('.cookie-banner button').addEventListener('click', (e) => {
      document.querySelector('[data-testid="clicked-marker"]').textContent = 'clicked:' + e.target.textContent;
    });</script>
  </body></html>`,
  "/no-banner": `<html><body><h1>Página normal, sin banner</h1></body></html>`,
  "/unrelated-buttons": `<html><body>
    <button>Confirmar compra</button>
    <button>Suscribirse al boletín</button>
    <p data-testid="clicked-marker">not-clicked</p>
    <script>document.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      document.querySelector('[data-testid="clicked-marker"]').textContent = 'clicked:' + b.textContent;
    }));</script>
  </body></html>`,
};

describe("handleConsentBanner — §8/§10-Fase 2 (B2)", () => {
  let server: Server;
  let baseUrl: string;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const body = PAGES[req.url ?? "/"];
      if (!body) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    browser = await launchSecureBrowser();
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    context = await createSecureContext(browser);
    page = await context.newPage();
  });

  afterEach(async () => {
    await context.close();
  });

  it("acepta un banner de una CMP conocida (selector de alta confianza)", async () => {
    await page.goto(`${baseUrl}/known-cmp`);
    const result = await handleConsentBanner(page);
    expect(result).toEqual({ interaction: "accepted_banner" });
    expect(await page.locator('[data-testid="clicked-marker"]').textContent()).toBe("clicked");
  });

  it("cae al match de texto exacto cuando no hay CMP conocida", async () => {
    await page.goto(`${baseUrl}/text-fallback`);
    const result = await handleConsentBanner(page);
    expect(result).toEqual({ interaction: "accepted_banner" });
    expect(await page.locator('[data-testid="clicked-marker"]').textContent()).toBe("clicked:Aceptar todas");
  });

  it("no interactúa cuando no hay banner — cobertura parcial documentada, no un fallo", async () => {
    await page.goto(`${baseUrl}/no-banner`);
    const result = await handleConsentBanner(page);
    expect(result).toEqual({ interaction: "not_detected" });
  });

  it("nunca hace click en botones no relacionados con cookies, aunque existan", async () => {
    await page.goto(`${baseUrl}/unrelated-buttons`);
    const result = await handleConsentBanner(page);
    expect(result).toEqual({ interaction: "not_detected" });
    expect(await page.locator('[data-testid="clicked-marker"]').textContent()).toBe("not-clicked");
  });
});
