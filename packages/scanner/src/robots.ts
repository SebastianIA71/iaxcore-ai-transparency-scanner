// §10-Fase 2: "robots.txt". Subconjunto estándar suficiente para el piloto —
// User-agent, Disallow, Allow; Crawl-delay/Sitemap/otros se ignoran (fuera
// de alcance). Identidad documentada en /bot (§14).
export const CRAWLER_USER_AGENT = "IAXCOREBot";

export interface RobotsRule {
  type: "allow" | "disallow";
  path: string;
}

export interface RobotsPolicy {
  rules: RobotsRule[];
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

function parseGroups(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let currentAgents: string[] = [];
  let currentRules: RobotsRule[] = [];
  let sawRuleSinceLastUserAgent = false;

  const flush = () => {
    if (currentAgents.length > 0) {
      groups.push({ agents: currentAgents, rules: currentRules });
    }
    currentAgents = [];
    currentRules = [];
    sawRuleSinceLastUserAgent = false;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (field === "user-agent") {
      // Una línea User-agent tras ya haber visto reglas del grupo actual
      // arranca un grupo nuevo; User-agent líneas consecutivas comparten grupo.
      if (sawRuleSinceLastUserAgent) {
        flush();
      }
      currentAgents.push(value.toLowerCase());
    } else if (field === "disallow" || field === "allow") {
      if (currentAgents.length === 0) continue; // regla huérfana antes de cualquier User-agent
      currentRules.push({ type: field, path: value });
      sawRuleSinceLastUserAgent = true;
    }
    // Crawl-delay, Sitemap, etc.: ignorados.
  }
  flush();
  return groups;
}

/**
 * Selecciona el grupo aplicable a userAgent (coincidencia exacta primero,
 * luego "*") y devuelve solo sus reglas — el resto del contenido de
 * robots.txt es irrelevante para nuestro crawler.
 */
export function parseRobotsTxt(content: string, userAgent: string = CRAWLER_USER_AGENT): RobotsPolicy {
  const groups = parseGroups(content);
  const uaLower = userAgent.toLowerCase();
  const exact = groups.find((g) => g.agents.includes(uaLower));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  return { rules: (exact ?? wildcard)?.rules ?? [] };
}

/**
 * Regla más específica (prefijo más largo) gana; empate entre Allow y
 * Disallow del mismo prefijo se resuelve a favor de Allow. Sin ninguna
 * coincidencia, permitido por defecto.
 */
export function isAllowedByRobots(policy: RobotsPolicy, pathname: string): boolean {
  let best: RobotsRule | null = null;
  for (const rule of policy.rules) {
    if (rule.path === "") continue; // Disallow/Allow vacío no restringe nada
    if (!pathname.startsWith(rule.path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.type === "allow")) {
      best = rule;
    }
  }
  return best === null || best.type === "allow";
}
