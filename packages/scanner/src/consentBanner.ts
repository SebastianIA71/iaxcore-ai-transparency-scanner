import type { Page } from "playwright";

export interface ConsentBannerResult {
  // §8/§10-Fase 2/§19 (B2): registrado tal cual en Evaluation.manifest
  // como "consent_interaction". "not_detected" cubre tanto "no había
  // banner" como "había algo pero no identificable con confianza" —
  // la spec pide cobertura parcial en ambos casos, no intentarlo.
  interaction: "accepted_banner" | "not_detected";
}

// Selectores de plataformas de gestión de consentimiento (CMP) conocidas —
// máxima confianza porque son específicos de producto, no heurística de
// texto libre. Lista no exhaustiva; ampliar aquí cuando la métrica de
// cobertura parcial (equivalente a §13 para T1) lo justifique.
const KNOWN_CMP_SELECTORS = [
  "#onetrust-accept-btn-handler",
  "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
  '.qc-cmp2-summary-buttons button[mode="primary"]',
  "#didomi-notice-agree-button",
  '#usercentrics-root button[data-testid="uc-accept-all-button"]',
  'button[data-testid="cookie-accept-all"]',
];

// Texto de aceptación ES/EN — coincidencia exacta (normalizada), no
// "contiene", para evitar falsos positivos como "Aceptar términos y
// proceder al pago". §4/§5.1 ya usan ES/EN como el par mínimo del piloto.
const ACCEPT_TEXT_PATTERNS = [
  /^accept all cookies?$/i,
  /^accept all$/i,
  /^accept cookies?$/i,
  /^accept$/i,
  /^i agree$/i,
  /^allow all$/i,
  /^allow all cookies?$/i,
  /^got it$/i,
  /^aceptar todo$/i,
  /^aceptar todas$/i,
  /^aceptar cookies?$/i,
  /^aceptar$/i,
  /^acepto$/i,
  /^permitir todo$/i,
  /^permitir todas$/i,
  /^de acuerdo$/i,
];

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * §8/§10-Fase 2 (B2): "el escáner puede aceptar el banner de cookies de
 * forma controlada... si no es identificable con confianza, no
 * interactúes y registra cobertura parcial." Se prueban primero los
 * selectores de CMPs conocidas (alta confianza); si ninguno aparece, se
 * cae a un match de texto exacto sobre botones/enlaces con rol de botón
 * visibles — nunca "contiene", para no disparar sobre un botón de compra
 * u otro control no relacionado con cookies.
 */
export async function handleConsentBanner(page: Page): Promise<ConsentBannerResult> {
  for (const selector of KNOWN_CMP_SELECTORS) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible().catch(() => false);
    if (visible) {
      await locator.click({ timeout: 2000 }).catch(() => {});
      return { interaction: "accepted_banner" };
    }
  }

  const candidates = page.locator('button, a[role="button"], [role="button"]');
  const count = await candidates.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const candidate = candidates.nth(i);
    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    const text = normalize((await candidate.innerText().catch(() => "")) ?? "");
    if (!text) continue;

    if (ACCEPT_TEXT_PATTERNS.some((pattern) => pattern.test(text))) {
      await candidate.click({ timeout: 2000 }).catch(() => {});
      return { interaction: "accepted_banner" };
    }
  }

  return { interaction: "not_detected" };
}
