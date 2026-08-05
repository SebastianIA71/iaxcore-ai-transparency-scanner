import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Browser, BrowserContext, Page } from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSecureContext, launchSecureBrowser } from "./browser.js";
import { DEFAULT_SELECT_PAGES_OPTIONS, selectPages } from "./pageSelection.js";
import { parseRobotsTxt } from "./robots.js";

const PAGES: Record<string, string> = {
  "/": `<html><body>
    <a href="/page-a">A</a>
    <a href="/page-b">B</a>
    <a href="/page-a">A otra vez</a>
    <a href="/blocked">Bloqueada por robots.txt</a>
    <a href="/page-c">C</a>
    <a href="/page-d">D</a>
    <a href="/page-e">E</a>
    <a href="https://external.test/other">Externa</a>
    <a href="#section">Ancla a la misma página</a>
  </body></html>`,
  "/page-a": "<html><body>A</body></html>",
  "/page-b": "<html><body>B</body></html>",
  "/page-c": "<html><body>C</body></html>",
  "/page-d": "<html><body>D</body></html>",
  "/page-e": "<html><body>E</body></html>",
  "/blocked": "<html><body>No deberías llegar aquí</body></html>",
};

// No pasa por el guard SSRF a propósito — esa es la responsabilidad de
// browser.test.ts. Aquí lo que se prueba es la selección de páginas contra
// un servidor local con estructura de enlaces conocida y determinista.
describe("selectPages — §10-Fase 2: selección determinista de hasta 5 páginas", () => {
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
    baseUrl = `http://127.0.0.1:${port}/`;

    browser = await launchSecureBrowser();
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    context = await createSecureContext(browser);
    page = await context.newPage();
    await page.goto(baseUrl);
  });

  afterEach(async () => {
    await context.close();
  });

  it("selecciona la página base más los enlaces del mismo origen, deduplicados, en orden de aparición", async () => {
    const policy = parseRobotsTxt("");
    const selected = await selectPages(page, baseUrl, policy, { maxPages: 10 });

    expect(selected).toEqual([
      baseUrl,
      `${baseUrl}page-a`,
      `${baseUrl}page-b`,
      `${baseUrl}blocked`,
      `${baseUrl}page-c`,
      `${baseUrl}page-d`,
      `${baseUrl}page-e`,
    ]);
  });

  it("nunca devuelve más de maxPages, aunque haya más enlaces disponibles", async () => {
    const policy = parseRobotsTxt("");
    const selected = await selectPages(page, baseUrl, policy, { maxPages: DEFAULT_SELECT_PAGES_OPTIONS.maxPages });
    expect(selected).toHaveLength(5);
  });

  it("excluye enlaces de otro origen", async () => {
    const policy = parseRobotsTxt("");
    const selected = await selectPages(page, baseUrl, policy, { maxPages: 10 });
    expect(selected.some((url) => url.includes("external.test"))).toBe(false);
  });

  it("respeta robots.txt — una página en Disallow nunca se selecciona", async () => {
    const policy = parseRobotsTxt("User-agent: *\nDisallow: /blocked\n");
    const selected = await selectPages(page, baseUrl, policy, { maxPages: 10 });
    expect(selected.some((url) => url.endsWith("/blocked"))).toBe(false);
  });

  it("un ancla a la misma página no cuenta como página nueva", async () => {
    const policy = parseRobotsTxt("");
    const selected = await selectPages(page, baseUrl, policy, { maxPages: 10 });
    expect(selected.filter((url) => url === baseUrl)).toHaveLength(1);
  });
});
