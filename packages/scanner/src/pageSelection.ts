import type { Page } from "playwright";
import { isAllowedByRobots, type RobotsPolicy } from "./robots.js";

export interface SelectPagesOptions {
  maxPages: number;
}

export const DEFAULT_SELECT_PAGES_OPTIONS: SelectPagesOptions = { maxPages: 5 };

/**
 * §10-Fase 2: "selección determinista de hasta cinco páginas". Lee los
 * <a href> ya presentes en el DOM renderizado (incluye enlaces insertados
 * por JS, a diferencia de parsear el HTML crudo), los normaliza a URL
 * absoluta, descarta los de otro origen y los bloqueados por robots.txt,
 * deduplica, y corta a maxPages en el orden en que aparecen en el
 * documento — determinista porque depende solo del DOM ya cargado, nunca
 * del orden de resolución de ninguna promesa.
 */
export async function selectPages(
  page: Page,
  baseUrl: string,
  robotsPolicy: RobotsPolicy,
  options: SelectPagesOptions = DEFAULT_SELECT_PAGES_OPTIONS,
): Promise<string[]> {
  const base = new URL(baseUrl);
  const selected: string[] = [];
  const seen = new Set<string>();

  const addIfEligible = (rawHref: string): void => {
    if (selected.length >= options.maxPages) return;
    let url: URL;
    try {
      url = new URL(rawHref);
    } catch {
      return;
    }
    url.hash = "";
    if (url.origin !== base.origin) return;
    if (seen.has(url.href)) return;
    if (!isAllowedByRobots(robotsPolicy, url.pathname)) return;
    seen.add(url.href);
    selected.push(url.href);
  };

  addIfEligible(base.href);

  const hrefs: string[] = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).href),
  );
  for (const href of hrefs) {
    if (selected.length >= options.maxPages) break;
    addIfEligible(href);
  }

  return selected;
}
