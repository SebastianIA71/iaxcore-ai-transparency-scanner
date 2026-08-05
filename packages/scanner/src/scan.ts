import type { Page } from "playwright";
import {
  createSecureContext,
  DEFAULT_GUARD_LIMITS,
  installSsrfGuard,
  launchSecureBrowser,
  type BlockedRequest,
  type HostnameResolver,
  type RequestBlockReason,
  type SsrfGuardLimits,
  type SsrfGuardState,
} from "./browser.js";
import { handleConsentBanner, type ConsentBannerResult } from "./consentBanner.js";
import { DEFAULT_SELECT_PAGES_OPTIONS, selectPages } from "./pageSelection.js";
import { parseRobotsTxt, type RobotsPolicy } from "./robots.js";
import { checkUrl } from "./ssrf.js";

export type PageExclusionReason =
  | RequestBlockReason
  | "navigation_failed"
  | "navigation_timeout"
  | "http_error"
  | "time_budget_exceeded";

export interface ScanManifestPage {
  url: string;
  status: "completed" | "excluded";
  exclusionReason?: PageExclusionReason;
  httpStatus?: number;
}

// §10-Fase 2 gate: "toda evaluación registra páginas seleccionadas, páginas
// completadas y causa de cada exclusión." `pages` es esa lista; `catchall`
// deja sitio para lo que añadan T1/T2 sin tocar este contrato (coincide con
// evaluationManifestSchema en packages/core, que también acepta claves extra).
export interface ScanManifest {
  consent_interaction: ConsentBannerResult["interaction"] | "not_attempted";
  pages: ScanManifestPage[];
  blocked_requests: BlockedRequest[];
  [key: string]: unknown;
}

export interface ScanResult {
  finalUrl: string;
  pagesRequested: number;
  pagesAnalyzed: number;
  manifest: ScanManifest;
}

export interface ScanOptions {
  maxPages?: number;
  perPageTimeoutMs?: number;
  totalTimeBudgetMs?: number;
  guardLimits?: SsrfGuardLimits;
  resolveHostname?: HostnameResolver;
  launchArgs?: string[];
}

const DEFAULT_PER_PAGE_TIMEOUT_MS = 15_000;
const DEFAULT_TOTAL_TIME_BUDGET_MS = 60_000;

function blockedResult(url: string, reason: PageExclusionReason): ScanResult {
  return {
    finalUrl: url,
    pagesRequested: 1,
    pagesAnalyzed: 0,
    manifest: {
      consent_interaction: "not_attempted",
      pages: [{ url, status: "excluded", exclusionReason: reason }],
      blocked_requests: [],
    },
  };
}

// Si el guard ya registró por qué bloqueó justo esta URL, esa es la causa
// real (SSRF, límite de tamaño, límite de redirecciones...) — más precisa
// que inferir "timeout" o "fallo genérico" del error que Playwright lanza
// cuando aborta una request a mitad de route().
function reasonFromGuard(guardState: SsrfGuardState, url: string): RequestBlockReason | null {
  for (let i = guardState.blocked.length - 1; i >= 0; i -= 1) {
    if (guardState.blocked[i]!.url === url) return guardState.blocked[i]!.reason;
  }
  return null;
}

async function visitPage(page: Page, url: string, timeoutMs: number, guardState: SsrfGuardState): Promise<ScanManifestPage> {
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (!response) {
      return { url, status: "excluded", exclusionReason: "navigation_failed" };
    }
    if (!response.ok()) {
      return { url, status: "excluded", exclusionReason: "http_error", httpStatus: response.status() };
    }
    return { url: page.url(), status: "completed" };
  } catch {
    const guardReason = reasonFromGuard(guardState, url);
    if (guardReason) {
      return { url, status: "excluded", exclusionReason: guardReason };
    }
    return { url, status: "excluded", exclusionReason: "navigation_timeout" };
  }
}

// robots.txt se pide a través del mismo contexto vigilado que todo lo
// demás (§9: "interceptar todas las solicitudes, no solo la principal") en
// vez de un fetch aparte — así nunca es una vía para saltarse el guard SSRF.
// Sin robots.txt (404) o si la petición falla, se permite todo: es el
// comportamiento estándar de un crawler, no una laxitud nuestra.
async function fetchRobotsPolicy(page: Page, startUrl: string, timeoutMs: number): Promise<RobotsPolicy> {
  const robotsUrl = new URL("/robots.txt", startUrl).href;
  try {
    const response = await page.goto(robotsUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (!response || !response.ok()) return { rules: [] };
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    return parseRobotsTxt(text);
  } catch {
    return { rules: [] };
  }
}

/**
 * §10-Fase 2: orquesta lo que ya existe suelto en este paquete (guard SSRF,
 * robots.txt, selección de páginas, banner de consentimiento) en un único
 * escaneo de principio a fin, y produce el manifest que exige el gate de
 * salida de la fase. No hace detección (T1/T2) ni toca la base de datos —
 * eso es responsabilidad de apps/worker, que llama a esto y persiste el
 * resultado.
 */
export async function runScan(startUrl: string, options: ScanOptions = {}): Promise<ScanResult> {
  const maxPages = options.maxPages ?? DEFAULT_SELECT_PAGES_OPTIONS.maxPages;
  const perPageTimeoutMs = options.perPageTimeoutMs ?? DEFAULT_PER_PAGE_TIMEOUT_MS;
  const totalTimeBudgetMs = options.totalTimeBudgetMs ?? DEFAULT_TOTAL_TIME_BUDGET_MS;
  const deadline = Date.now() + totalTimeBudgetMs;

  const initialCheck = checkUrl(startUrl);
  if (!initialCheck.allowed) {
    return blockedResult(startUrl, initialCheck.reason!);
  }

  const browser = await launchSecureBrowser(options.launchArgs);
  try {
    const context = await createSecureContext(browser);
    const guardState = installSsrfGuard(context, {
      limits: options.guardLimits ?? DEFAULT_GUARD_LIMITS,
      resolveHostname: options.resolveHostname,
    });
    const page = await context.newPage();

    try {
      const robotsPolicy = await fetchRobotsPolicy(page, startUrl, perPageTimeoutMs);

      const pages: ScanManifestPage[] = [];
      let consentInteraction: ScanManifest["consent_interaction"] = "not_attempted";

      const startResult = await visitPage(page, startUrl, perPageTimeoutMs, guardState);
      pages.push(startResult);

      let selected: string[] = [];
      if (startResult.status === "completed") {
        const consentResult = await handleConsentBanner(page).catch(
          (): ConsentBannerResult => ({ interaction: "not_detected" }),
        );
        consentInteraction = consentResult.interaction;
        selected = await selectPages(page, startResult.url, robotsPolicy, { maxPages });
      }

      // selectPages siempre antepone la propia página base (ver
      // pageSelection.ts); ya está registrada arriba como startResult.
      for (const url of selected.slice(1)) {
        if (Date.now() >= deadline) {
          pages.push({ url, status: "excluded", exclusionReason: "time_budget_exceeded" });
          continue;
        }
        pages.push(await visitPage(page, url, perPageTimeoutMs, guardState));
      }

      const pagesAnalyzed = pages.filter((p) => p.status === "completed").length;
      return {
        finalUrl: startResult.url,
        pagesRequested: pages.length,
        pagesAnalyzed,
        manifest: {
          consent_interaction: consentInteraction,
          pages,
          blocked_requests: guardState.blocked,
        },
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
