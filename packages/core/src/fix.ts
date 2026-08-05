import { COPY, type CopyLocale } from "./copy.js";

export interface AiDisclosureFix {
  locale: CopyLocale;
  noticeText: string;
  htmlSnippet: string;
  placementInstructions: string;
}

// Colores por defecto del snippet — elegidos para que contrastRatio() (ver
// abajo) cumpla WCAG 2.1 AA para texto normal (≥4.5:1), no solo "se ven
// bien". Ver fix.test.ts para la comprobación real, no solo el comentario.
export const FIX_TEXT_COLOR = "#1a1a1a";
export const FIX_BACKGROUND_COLOR = "#f5f5f0";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * §10-Fase 4: "generador de aviso accesible, con variantes por idioma y
 * canal". El único canal que T1 sabe detectar hoy es un widget de
 * chat/interacción (§5.1) — esta es su única variante de canal; ampliar
 * cuando T1 cubra otros tipos de canal, no antes. `role="status"` +
 * `aria-live="polite"` para que un lector de pantalla lo anuncie sin
 * interrumpir lo que el visitante esté haciendo — el requisito de
 * accesibilidad del entregable, no solo el de contraste de color.
 */
export function generateAiDisclosureFix(locale: CopyLocale): AiDisclosureFix {
  const noticeText = COPY[locale].fix.aiDisclosureNotice;
  const placementInstructions = COPY[locale].fix.placementInstructions;
  const htmlSnippet = `<div role="status" aria-live="polite" style="color:${FIX_TEXT_COLOR};background-color:${FIX_BACKGROUND_COLOR};padding:0.75rem 1rem;border-radius:0.5rem;font:inherit;">${escapeHtml(noticeText)}</div>`;
  return { locale, noticeText, htmlSnippet, placementInstructions };
}

// WCAG 2.1 §1.4.3 — luminancia relativa y ratio de contraste, fórmula
// estándar de la propia spec del W3C. No hay librería para esto entre las
// dependencias del monorepo; es una fórmula corta y estable, no vale la
// pena una dependencia nueva por ella.
function relativeLuminance(hex: string): number {
  const channels = hex.replace("#", "").match(/.{2}/g)!.map((c) => Number.parseInt(c, 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}
