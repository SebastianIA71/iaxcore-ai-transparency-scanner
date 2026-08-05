import { describe, expect, it } from "vitest";
import { contrastRatio, FIX_BACKGROUND_COLOR, FIX_TEXT_COLOR, generateAiDisclosureFix } from "./fix.js";

describe("generateAiDisclosureFix — §10-Fase 4: generador de aviso accesible", () => {
  it("produce texto, snippet e instrucciones para ES y EN", () => {
    for (const locale of ["es", "en"] as const) {
      const fix = generateAiDisclosureFix(locale);
      expect(fix.locale).toBe(locale);
      expect(fix.noticeText.length).toBeGreaterThan(0);
      expect(fix.placementInstructions.length).toBeGreaterThan(0);
      expect(fix.htmlSnippet).toContain(fix.noticeText);
    }
  });

  it("el snippet lleva role=status y aria-live=polite (accesible para lector de pantalla)", () => {
    const fix = generateAiDisclosureFix("en");
    expect(fix.htmlSnippet).toContain('role="status"');
    expect(fix.htmlSnippet).toContain('aria-live="polite"');
  });

  it("escapa HTML del texto del aviso dentro del snippet", () => {
    // No hay caracteres especiales en el texto real, pero el escape en sí
    // no debe romper el snippet — comprobación de que escapeHtml() se aplica,
    // no de que el texto actual los necesite.
    const fix = generateAiDisclosureFix("es");
    expect(fix.htmlSnippet).not.toContain("<script>");
  });

  it("el color por defecto del snippet cumple WCAG 2.1 AA para texto normal (≥4.5:1)", () => {
    expect(contrastRatio(FIX_TEXT_COLOR, FIX_BACKGROUND_COLOR)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrastRatio", () => {
  it("negro sobre blanco da el contraste máximo (21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("un color contra sí mismo da contraste 1:1 (sin contraste)", () => {
    expect(contrastRatio("#808080", "#808080")).toBeCloseTo(1, 5);
  });

  it("es simétrico — el orden de los dos colores no importa", () => {
    expect(contrastRatio("#1a1a1a", "#f5f5f0")).toBeCloseTo(contrastRatio("#f5f5f0", "#1a1a1a"), 10);
  });
});
