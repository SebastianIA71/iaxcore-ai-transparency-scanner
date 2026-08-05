import { describe, expect, it } from "vitest";
import { hashIp } from "./privacy.js";

describe("hashIp (§9)", () => {
  it("es determinista para la misma IP", () => {
    expect(hashIp("203.0.113.7")).toBe(hashIp("203.0.113.7"));
  });

  it("distintas IPs producen hashes distintos", () => {
    expect(hashIp("203.0.113.7")).not.toBe(hashIp("203.0.113.8"));
  });

  it("no devuelve la IP en claro", () => {
    expect(hashIp("203.0.113.7")).not.toContain("203.0.113.7");
  });
});
