import { promises as dns } from "node:dns";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { checkUrl, classifyAddress, type SsrfBlockReason } from "./ssrf.js";

// §9: aislamiento por evaluación — contexto nuevo, sin credenciales, sin
// storageState, sin acceso a red interna del host.
export async function launchSecureBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

export async function createSecureContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext();
}

export type RequestBlockReason = SsrfBlockReason | "unresolved_hostname" | "request_limit";

export interface BlockedRequest {
  url: string;
  reason: RequestBlockReason;
}

export interface SsrfGuardLimits {
  maxRequests: number;
}

export const DEFAULT_GUARD_LIMITS: SsrfGuardLimits = {
  maxRequests: 200,
};

// Inyectable para tests: resolver una IP real no debería depender de una
// evaluación real corriendo, ni de infraestructura de red montada aparte —
// ver browser.test.ts.
export type HostnameResolver = (hostname: string) => Promise<string>;

async function defaultResolver(hostname: string): Promise<string> {
  const { address } = await dns.lookup(hostname);
  return address;
}

export interface SsrfGuardState {
  requestCount: number;
  blocked: BlockedRequest[];
}

/**
 * §9: "Interceptar todas las solicitudes del navegador, no solo la URL
 * principal; una imagen o script también puede intentar acceder a servicios
 * internos." Cada request (documento principal, subrecursos, redirecciones)
 * pasa por checkUrl() (protocolo/puerto/IP literal) y, si el host es un
 * nombre, se resuelve y su IP real se revalida con classifyAddress() —
 * defensa contra DNS rebinding, no solo contra pasar una IP a mano.
 */
export function installSsrfGuard(
  context: BrowserContext,
  options: { limits?: SsrfGuardLimits; resolveHostname?: HostnameResolver } = {},
): SsrfGuardState {
  const limits = options.limits ?? DEFAULT_GUARD_LIMITS;
  const resolveHostname = options.resolveHostname ?? defaultResolver;
  const state: SsrfGuardState = { requestCount: 0, blocked: [] };

  context.route("**/*", async (route) => {
    const url = route.request().url();

    const urlCheck = checkUrl(url);
    if (!urlCheck.allowed) {
      state.blocked.push({ url, reason: urlCheck.reason! });
      await route.abort("blockedbyclient");
      return;
    }

    state.requestCount += 1;
    if (state.requestCount > limits.maxRequests) {
      state.blocked.push({ url, reason: "request_limit" });
      await route.abort("blockedbyclient");
      return;
    }

    const hostname = new URL(url).hostname;
    let resolvedIp: string;
    try {
      resolvedIp = await resolveHostname(hostname);
    } catch {
      state.blocked.push({ url, reason: "unresolved_hostname" });
      await route.abort("blockedbyclient");
      return;
    }

    const addressReason = classifyAddress(resolvedIp);
    if (addressReason) {
      state.blocked.push({ url, reason: addressReason });
      await route.abort("blockedbyclient");
      return;
    }

    await route.continue();
  });

  return state;
}
