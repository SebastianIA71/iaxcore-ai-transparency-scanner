import type { Detector, DetectorContext, DetectorResult } from "@iaxcore/core";
import {
  checkUrl,
  createSecureContext,
  installSsrfGuard,
  launchSecureBrowser,
  type HostnameResolver,
  type SsrfGuardLimits,
} from "@iaxcore/scanner";
import { buildFinding } from "./finding.js";
import { detectVisibleLabels } from "./labelDetection.js";

const NAVIGATION_TIMEOUT_MS = 15_000;

export interface T2DetectionOptions {
  resolveHostname?: HostnameResolver;
  guardLimits?: SsrfGuardLimits;
  launchArgs?: string[];
}

// §5.2: "regla dura: T2 nunca produce fail ni action_recommended solo por
// no detectar una etiqueta" — de ahí que este finding nunca lleve
// assessmentStatus (ver el comentario en entities.ts: solo t1.assessment
// lo lleva). No hay nada que "evaluar", solo describir lo encontrado.
function buildResult(
  evaluationId: string,
  observationStatus: "detected" | "not_detected" | "error",
  confidenceBand: "high" | "medium" | "low",
  signals: Awaited<ReturnType<typeof detectVisibleLabels>>,
): DetectorResult {
  const summaryKey = `t2.visible_labelling.${observationStatus}`;
  return {
    findings: [
      buildFinding(evaluationId, "t2.visible_labelling", observationStatus, confidenceBand, summaryKey, {
        count: signals.length,
        signals,
      }),
    ],
  };
}

function buildErrorResult(evaluationId: string): DetectorResult {
  return buildResult(evaluationId, "error", "low", []);
}

/**
 * §5.2/§10-Fase 5: T2 · Visible AI Labelling — bloque informativo, no
 * bloqueante. Navega de forma independiente a `finalUrl` (mismo motivo que
 * T1 — ver el comentario en t1Detector.ts), busca etiquetas visibles de
 * contenido generado/manipulado por IA (figcaption/alt/aria-label/texto
 * corto junto a un `<figure>`, nunca el cuerpo de texto genérico — ver
 * labelDetection.ts) y produce un único finding puramente descriptivo: no
 * decide si un contenido sin etiqueta debía tenerla, y nunca escala a
 * `action_recommended`. Deliberadamente no sigue declaraciones de
 * transparencia enlazadas desde la página (§5.2, pospuesto) ni navega a
 * más de una página (T1 sí, vía `runScan()`'s selección de páginas — T2
 * no la reutiliza porque ampliar su alcance de crawl es precisamente lo
 * que la spec pospone).
 */
export async function runT2Detection(
  evaluationId: string,
  finalUrl: string,
  options: T2DetectionOptions = {},
): Promise<DetectorResult> {
  if (!checkUrl(finalUrl).allowed) {
    return buildErrorResult(evaluationId);
  }

  const browser = await launchSecureBrowser(options.launchArgs);
  try {
    const browserContext = await createSecureContext(browser);
    installSsrfGuard(browserContext, { limits: options.guardLimits, resolveHostname: options.resolveHostname });
    const page = await browserContext.newPage();

    let response;
    try {
      response = await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    } catch {
      return buildErrorResult(evaluationId);
    }
    if (!response || !response.ok()) {
      return buildErrorResult(evaluationId);
    }

    const signals = await detectVisibleLabels(page);
    if (signals.length === 0) {
      return buildResult(evaluationId, "not_detected", "medium", signals);
    }
    return buildResult(evaluationId, "detected", "high", signals);
  } finally {
    await browser.close();
  }
}

export const t2Detector: Detector<"t2"> = {
  id: "t2",
  version: "0.1.0",
  run: (context: DetectorContext) => runT2Detection(context.evaluationId, context.finalUrl),
};
