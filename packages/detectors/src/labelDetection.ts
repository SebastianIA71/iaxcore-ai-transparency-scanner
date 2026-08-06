import type { Page } from "playwright";
import { AI_LABEL_PATTERNS, matchesAny, normalizeText } from "./patterns.js";

export type LabelLocation = "figcaption" | "alt" | "aria-label" | "caption-text";

export interface LabelSignal {
  location: LabelLocation;
  matchedText: string;
}

const MAX_MATCHED_TEXT_LENGTH = 200;
// Un candidato de "caption-text" más largo que esto ya no es una etiqueta
// corta junto a un medio — es prosa que resulta estar dentro de un
// <figure> por casualidad de maquetación, no una señal de etiquetado.
const MAX_CAPTION_CANDIDATE_LENGTH = 200;

interface RawCandidate {
  location: LabelLocation;
  text: string;
}

// §5.2: "etiquetas... Atributos cercanos a imágenes, audio, vídeo o
// artículos: figcaption, alt, aria-label." Cada candidato viene de una
// posición del DOM que ya de por sí sugiere "esto es una etiqueta", no de
// texto suelto — la combinación posición+patrón (no el patrón solo) es lo
// que evita el falso positivo de F12 (texto editorial que menciona IA sin
// ser una etiqueta de contenido).
async function collectCandidates(page: Page): Promise<RawCandidate[]> {
  return page.evaluate((maxCaptionLength) => {
    const results: { location: string; text: string }[] = [];

    document.querySelectorAll("figcaption").forEach((el) => {
      const text = (el.textContent ?? "").trim();
      if (text) results.push({ location: "figcaption", text });
    });

    document.querySelectorAll("img, video, audio").forEach((el) => {
      const alt = el.getAttribute("alt")?.trim();
      if (alt) results.push({ location: "alt", text: alt });
      const ariaLabel = el.getAttribute("aria-label")?.trim();
      if (ariaLabel) results.push({ location: "aria-label", text: ariaLabel });
    });

    document.querySelectorAll("figure").forEach((figure) => {
      const clone = figure.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("figcaption, img, video, audio, picture, source").forEach((el) => el.remove());
      const text = (clone.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text && text.length <= maxCaptionLength) results.push({ location: "caption-text", text });
    });

    return results;
  }, MAX_CAPTION_CANDIDATE_LENGTH) as Promise<RawCandidate[]>;
}

/**
 * §5.2/§10-Fase 5: busca etiquetas visibles de contenido generado/manipulado
 * por IA. Puramente descriptivo — no decide si un contenido sin etiqueta
 * debía tenerla (§5.2: "no intenta decidir si un contenido no etiquetado
 * debía estarlo").
 */
export async function detectVisibleLabels(page: Page): Promise<LabelSignal[]> {
  const candidates = await collectCandidates(page).catch(() => [] as RawCandidate[]);
  const signals: LabelSignal[] = [];
  for (const candidate of candidates) {
    const text = normalizeText(candidate.text);
    if (matchesAny(text, AI_LABEL_PATTERNS)) {
      signals.push({ location: candidate.location, matchedText: text.slice(0, MAX_MATCHED_TEXT_LENGTH) });
    }
  }
  return signals;
}
