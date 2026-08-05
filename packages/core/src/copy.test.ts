import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_ACTION_RECOMMENDED_PHRASES_EN,
  FORBIDDEN_ACTION_RECOMMENDED_PHRASES_ES,
} from "./vocabulary.js";
import { allCopyStrings, COPY, findForbiddenWords } from "./copy.js";

describe("§4: test automático de copy — falla el build si aparecen palabras prohibidas", () => {
  it("ninguna cadena del diccionario ES/EN contiene una palabra prohibida", () => {
    for (const text of allCopyStrings()) {
      expect(findForbiddenWords(text), `texto con palabra prohibida: "${text}"`).toEqual([]);
    }
  });

  it("action_recommended nunca dice 'falta un aviso obligatorio' (ES) ni su equivalente EN", () => {
    const es = COPY.es.t1.actionRecommended.toLowerCase();
    const en = COPY.en.t1.actionRecommended.toLowerCase();
    for (const phrase of FORBIDDEN_ACTION_RECOMMENDED_PHRASES_ES) {
      expect(es.includes(phrase)).toBe(false);
    }
    for (const phrase of FORBIDDEN_ACTION_RECOMMENDED_PHRASES_EN) {
      expect(en.includes(phrase)).toBe(false);
    }
  });

  it("findForbiddenWords detecta una palabra prohibida cuando está presente", () => {
    expect(findForbiddenWords("Este sitio cumple con la normativa")).toContain("cumple");
    expect(findForbiddenWords("This system is fully compliant")).toContain("compliant");
  });
});
