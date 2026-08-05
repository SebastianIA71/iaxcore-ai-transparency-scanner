import type { Locator, Page } from "playwright";
import { PROVIDER_SIGNATURES, type ProviderSignature } from "../signatures/index.js";
import { HUMAN_INTERMEDIARY_PATTERNS, matchesAny, normalizeText } from "./patterns.js";

// Heurística genérica de "hay un botón para abrir un chat" — deliberadamente
// más importante que la lista de proveedores conocidos (ver signatures/index.ts):
// un selector CSS por proveedor caduca cada vez que ese proveedor rediseña su
// widget y no se puede verificar en vivo desde este entorno, así que aquí el
// texto/aria-label visible es la señal principal, y el proveedor conocido solo
// sube la confianza y ayuda a clasificar t1.ai_evidence más adelante.
const LAUNCHER_TEXT_PATTERNS: readonly RegExp[] = [
  /\bchat\b/i,
  /live chat/i,
  /chat with us/i,
  /need help/i,
  /ask a question/i,
  /\bchatea\b/i,
  /habla con nosotros/i,
  /necesitas ayuda/i,
  /\basistencia\b/i,
  /discuter/i,
  /besoin d'aide/i,
  /chatten/i,
  /brauchen sie hilfe/i,
  /\bchatta\b/i,
  /hai bisogno di aiuto/i,
  /precisa de ajuda/i,
] as const;

// Tope de candidatos a inspeccionar — una página patológica con miles de
// botones no debe convertir la detección en un bucle sin fin (mismo espíritu
// que los límites de §9 en packages/scanner).
const MAX_LAUNCHER_CANDIDATES = 400;

async function detectVendor(page: Page): Promise<ProviderSignature | null> {
  const globalNames = [...new Set(PROVIDER_SIGNATURES.flatMap((sig) => sig.globals ?? []))];
  const presentGlobals: string[] = await page
    .evaluate((names) => names.filter((name) => (window as unknown as Record<string, unknown>)[name] !== undefined), globalNames)
    .catch(() => [] as string[]);

  const srcs: string[] = await page
    .$$eval("script[src], iframe[src]", (elements) =>
      elements.map((el) => (el as HTMLScriptElement | HTMLIFrameElement).src).filter(Boolean),
    )
    .catch(() => [] as string[]);

  for (const sig of PROVIDER_SIGNATURES) {
    if (sig.globals?.some((g) => presentGlobals.includes(g))) return sig;
    if (sig.scriptSrcPatterns?.some((pattern) => srcs.some((src) => pattern.test(src)))) return sig;
  }
  return null;
}

async function findLauncherCandidate(page: Page): Promise<Locator | null> {
  const candidates = page.locator('button, [role="button"], a');
  const count = Math.min(await candidates.count().catch(() => 0), MAX_LAUNCHER_CANDIDATES);

  for (let i = 0; i < count; i += 1) {
    const el = candidates.nth(i);
    const visible = await el.isVisible().catch(() => false);
    if (!visible) continue;

    const label = normalizeText(
      ((await el.getAttribute("aria-label").catch(() => null)) ?? (await el.innerText().catch(() => ""))) || "",
    );
    if (!label) continue;
    if (matchesAny(label, LAUNCHER_TEXT_PATTERNS)) return el;
  }
  return null;
}

// §9 (Fase 2) ya prueba que interceptar todas las requests, no solo la
// navegación principal, cubre iframes cross-origin; leer su texto aquí se
// apoya en lo mismo — Playwright opera a nivel de CDP, no de JS de página,
// así que frame.locator() sí puede leer un iframe cross-origin (a diferencia
// de un fetch() hecho desde la propia página, sujeto a CORS).
async function collectVisibleText(page: Page): Promise<string> {
  const parts: string[] = [];
  for (const frame of page.frames()) {
    const text = await frame
      .locator("body")
      .innerText({ timeout: 1000 })
      .catch(() => "");
    if (text) parts.push(text);
  }
  return normalizeText(parts.join("\n"));
}

export type ChannelDetectionResult =
  | { status: "not_detected"; humanIntermediaryDetected: boolean }
  | { status: "not_assessable" }
  | {
      status: "detected";
      humanIntermediaryDetected: false;
      vendor: ProviderSignature | null;
      confidence: "high" | "medium";
      panelText: string;
    };

/**
 * §5.1/§10-Fase 3: encuentra un canal de interacción candidato y lo abre de
 * forma pasiva (un solo click, sin enviar mensajes — "el motor puede abrir
 * el widget, pero no debe enviar mensajes, crear conversaciones, activar
 * flujos comerciales ni aceptar términos"). El texto visible tras abrirlo
 * es la base de la clasificación de ai_evidence/disclosure — ver
 * classification.ts.
 */
export async function detectAndOpenChannel(page: Page): Promise<ChannelDetectionResult> {
  const vendor = await detectVendor(page);
  const launcher = await findLauncherCandidate(page);

  if (!launcher) {
    return { status: "not_detected", humanIntermediaryDetected: false };
  }

  const beforeText = await collectVisibleText(page);
  await launcher.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const afterText = await collectVisibleText(page);

  // Umbral simple: si no apareció contenido visible nuevo, el click no
  // abrió nada inspeccionable (elemento no era en realidad un lanzador de
  // chat, o el panel no cargó) — §5.1 llama a esto "widget no se puede
  // abrir/inspeccionar", no "sin canal".
  const opened = afterText.length > beforeText.length + 20;
  if (!opened) {
    return { status: "not_assessable" };
  }

  if (matchesAny(afterText, HUMAN_INTERMEDIARY_PATTERNS)) {
    return { status: "not_detected", humanIntermediaryDetected: true };
  }

  return {
    status: "detected",
    humanIntermediaryDetected: false,
    vendor,
    confidence: vendor ? "high" : "medium",
    panelText: afterText,
  };
}
