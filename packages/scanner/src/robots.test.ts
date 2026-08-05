import { describe, expect, it } from "vitest";
import { isAllowedByRobots, parseRobotsTxt } from "./robots.js";

describe("parseRobotsTxt / isAllowedByRobots (§10-Fase 2)", () => {
  it("permite todo cuando no hay Disallow aplicable", () => {
    const policy = parseRobotsTxt("User-agent: *\nDisallow:\n");
    expect(isAllowedByRobots(policy, "/anything")).toBe(true);
  });

  it("bloquea un path bajo un Disallow simple", () => {
    const policy = parseRobotsTxt("User-agent: *\nDisallow: /admin\n");
    expect(isAllowedByRobots(policy, "/admin")).toBe(false);
    expect(isAllowedByRobots(policy, "/admin/users")).toBe(false);
    expect(isAllowedByRobots(policy, "/public")).toBe(true);
  });

  it("el prefijo más específico gana (Allow anidado dentro de un Disallow)", () => {
    const policy = parseRobotsTxt("User-agent: *\nDisallow: /private\nAllow: /private/public-page\n");
    expect(isAllowedByRobots(policy, "/private/secret")).toBe(false);
    expect(isAllowedByRobots(policy, "/private/public-page")).toBe(true);
    expect(isAllowedByRobots(policy, "/private/public-page/nested")).toBe(true);
  });

  it("prefiere el grupo con el user-agent exacto sobre el comodín *", () => {
    const content = ["User-agent: *", "Disallow: /", "", "User-agent: IAXCOREBot", "Disallow:", ""].join("\n");
    const policy = parseRobotsTxt(content, "IAXCOREBot");
    expect(isAllowedByRobots(policy, "/anything")).toBe(true);
  });

  it("cae al grupo * si no hay grupo para nuestro user-agent", () => {
    const content = ["User-agent: GoogleBot", "Disallow: /nope", "", "User-agent: *", "Disallow: /blocked", ""].join(
      "\n",
    );
    const policy = parseRobotsTxt(content, "IAXCOREBot");
    expect(isAllowedByRobots(policy, "/nope")).toBe(true);
    expect(isAllowedByRobots(policy, "/blocked")).toBe(false);
  });

  it("ignora comentarios y reglas huérfanas antes de cualquier User-agent", () => {
    const content = ["# comentario suelto", "Disallow: /huerfano", "User-agent: *", "Disallow: /real # inline"].join(
      "\n",
    );
    const policy = parseRobotsTxt(content);
    expect(isAllowedByRobots(policy, "/huerfano")).toBe(true);
    expect(isAllowedByRobots(policy, "/real")).toBe(false);
  });

  it("varios User-agent consecutivos comparten el mismo grupo de reglas", () => {
    const content = ["User-agent: A", "User-agent: B", "Disallow: /shared"].join("\n");
    expect(isAllowedByRobots(parseRobotsTxt(content, "A"), "/shared")).toBe(false);
    expect(isAllowedByRobots(parseRobotsTxt(content, "B"), "/shared")).toBe(false);
  });

  it("un robots.txt vacío permite todo", () => {
    expect(isAllowedByRobots(parseRobotsTxt(""), "/anything")).toBe(true);
  });
});
