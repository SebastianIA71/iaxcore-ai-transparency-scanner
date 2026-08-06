import { promises as dns } from "node:dns";
import chromiumServerless from "@sparticuz/chromium";
import { chromium, type Browser, type BrowserContext, type Request } from "playwright";
import { chromium as chromiumCore } from "playwright-core";
import { checkUrl, classifyAddress, type SsrfBlockReason } from "./ssrf.js";

// Vercel (y AWS Lambda, que Vercel Functions usa por debajo) fija estas
// variables en el propio entorno de ejecución — no hace falta configurarlas
// a mano. `playwright`'s Chromium empaquetado (~300 MB) no cabe en el
// límite de tamaño de una función serverless; `@sparticuz/chromium` (~40MB)
// + `playwright-core` (~5MB, misma API, sin navegador embebido) sí.
// Exportada solo para poder probar la decisión sin ejecutar de verdad el
// binario de @sparticuz/chromium — ese binario está compilado para Amazon
// Linux (el runtime real de Vercel Functions/AWS Lambda) y no corre en un
// entorno de desarrollo Windows/macOS; su camino solo puede verificarse
// desplegado de verdad.
export function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

// §9: aislamiento por evaluación — contexto nuevo, sin credenciales, sin
// storageState, sin acceso a red interna del host. `args` solo existe para
// que los tests puedan usar --host-resolver-rules y apuntar un hostname de
// mentira a un servidor local sin necesidad de tocar /etc/hosts — nunca se
// usa así en producción.
export async function launchSecureBrowser(args: string[] = []): Promise<Browser> {
  if (isServerlessRuntime()) {
    // playwright-core's Browser type is the same declaration "playwright"
    // re-exports, so no cast needed for the rest of this module (and its
    // callers) to treat it identically.
    return chromiumCore.launch({
      args: [...chromiumServerless.args, ...args],
      executablePath: await chromiumServerless.executablePath(),
      headless: true,
    });
  }
  return chromium.launch({ headless: true, args });
}

export async function createSecureContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext();
}

export type RequestBlockReason =
  | SsrfBlockReason
  | "unresolved_hostname"
  | "request_limit"
  | "redirect_limit"
  | "resource_size_limit"
  | "total_size_limit";

export interface BlockedRequest {
  url: string;
  reason: RequestBlockReason;
}

export interface SsrfGuardLimits {
  maxRequests: number;
  maxRedirects: number;
  maxResourceBytes: number;
  maxTotalBytes: number;
}

// §9: "límites globales: páginas, tiempo, requests, bytes totales, tamaño
// por recurso, redirecciones y concurrencia." Páginas/tiempo/concurrencia
// se aplican en la capa de orquestación (worker/pageSelection), no aquí.
export const DEFAULT_GUARD_LIMITS: SsrfGuardLimits = {
  maxRequests: 200,
  maxRedirects: 5,
  maxResourceBytes: 10 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
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
  totalBytes: number;
  blocked: BlockedRequest[];
}

function redirectDepthOf(request: Request): number {
  let depth = 0;
  let current = request.redirectedFrom();
  while (current) {
    depth += 1;
    current = current.redirectedFrom();
  }
  return depth;
}

/**
 * §9: "Interceptar todas las solicitudes del navegador, no solo la URL
 * principal; una imagen o script también puede intentar acceder a servicios
 * internos." Cada request pasa por checkUrl() (protocolo/puerto/IP literal)
 * y, si el host es un nombre, se resuelve y su IP real se revalida con
 * classifyAddress() — defensa contra DNS rebinding, no solo contra pasar
 * una IP a mano.
 *
 * **Aviso importante sobre redirecciones**: se comprobó empíricamente que
 * `context.route()` NO se vuelve a invocar por cada salto de una
 * redirección — solo ve la request original, con `redirectedFrom() ===
 * null` siempre. Un origen permitido que redirige a `http://127.0.0.1/...`
 * llega a cargarse sin que `route()` lo vea. Los eventos `request`/
 * `response` del contexto sí se disparan para cada salto con la
 * profundidad correcta, así que ahí es donde se revalida el destino real
 * — pero un evento no puede abortar la conexión que ya está en curso, solo
 * observarla. Ante una violación en un salto de redirección, la única
 * mitigación disponible es cerrar el contexto entero (parar todo lo demás
 * que la página pudiera hacer con esa respuesta) — no es prevención
 * perfecta como sí lo es para la request inicial. Una solución realmente
 * preventiva para este caso requeriría enrutar todo el tráfico de Chromium
 * a través de un proxy local (--proxy-server) que inspeccione cada CONNECT
 * antes de que exista conexión — no implementado todavía.
 */
export function installSsrfGuard(
  context: BrowserContext,
  options: { limits?: SsrfGuardLimits; resolveHostname?: HostnameResolver } = {},
): SsrfGuardState {
  const limits = options.limits ?? DEFAULT_GUARD_LIMITS;
  const resolveHostname = options.resolveHostname ?? defaultResolver;
  const state: SsrfGuardState = { requestCount: 0, totalBytes: 0, blocked: [] };
  let killed = false;

  async function evaluate(url: string, redirectDepth: number): Promise<RequestBlockReason | null> {
    const urlCheck = checkUrl(url);
    if (!urlCheck.allowed) return urlCheck.reason!;
    if (redirectDepth > limits.maxRedirects) return "redirect_limit";

    const hostname = new URL(url).hostname;
    let resolvedIp: string;
    try {
      resolvedIp = await resolveHostname(hostname);
    } catch {
      return "unresolved_hostname";
    }
    return classifyAddress(resolvedIp);
  }

  context.route("**/*", async (route) => {
    const url = route.request().url();

    state.requestCount += 1;
    if (state.requestCount > limits.maxRequests) {
      state.blocked.push({ url, reason: "request_limit" });
      await route.abort("blockedbyclient");
      return;
    }

    const reason = await evaluate(url, 0);
    if (reason) {
      state.blocked.push({ url, reason });
      await route.abort("blockedbyclient");
      return;
    }

    await route.continue();
  });

  // Detección (no prevención) del destino real de cada salto de
  // redirección — ver el aviso arriba. Solo actúa sobre requests que
  // vinieron de una redirección (redirectedFrom() no nulo); la request
  // inicial de cada cadena ya pasó por route() arriba.
  context.on("request", (request) => {
    if (killed) return;
    const source = request.redirectedFrom();
    if (!source) return;

    const depth = redirectDepthOf(request);
    void evaluate(request.url(), depth).then((reason) => {
      if (reason && !killed) {
        killed = true;
        state.blocked.push({ url: request.url(), reason });
        void context.close();
      }
    });
  });

  context.on("response", async (response) => {
    let body: Buffer;
    try {
      body = await response.body();
    } catch {
      // Respuesta sin cuerpo legible (redirect puro, error de red ya
      // reportado por Playwright, etc.) — nada que sumar.
      return;
    }

    if (body.length > limits.maxResourceBytes) {
      state.blocked.push({ url: response.url(), reason: "resource_size_limit" });
      return;
    }

    state.totalBytes += body.length;
    if (state.totalBytes > limits.maxTotalBytes) {
      state.blocked.push({ url: response.url(), reason: "total_size_limit" });
    }
  });

  return state;
}
