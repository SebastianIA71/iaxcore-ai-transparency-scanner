import { describe, expect, it } from "vitest";
import { checkUrl, classifyAddress } from "./ssrf.js";

describe("checkUrl — §9 bloqueante", () => {
  it("permite una URL pública normal", () => {
    expect(checkUrl("https://example.com")).toEqual({ allowed: true });
    expect(checkUrl("http://example.com:80")).toEqual({ allowed: true });
    expect(checkUrl("https://example.com:443/path?query=1")).toEqual({ allowed: true });
  });

  it("rechaza protocolos no http/https", () => {
    expect(checkUrl("file:///etc/passwd")).toEqual({ allowed: false, reason: "disallowed_protocol" });
    expect(checkUrl("ftp://example.com")).toEqual({ allowed: false, reason: "disallowed_protocol" });
    expect(checkUrl("gopher://example.com")).toEqual({ allowed: false, reason: "disallowed_protocol" });
  });

  it("rechaza URLs sintácticamente inválidas", () => {
    expect(checkUrl("not a url")).toEqual({ allowed: false, reason: "invalid_url" });
  });

  it("rechaza puertos no permitidos", () => {
    expect(checkUrl("http://example.com:8080")).toEqual({ allowed: false, reason: "disallowed_port" });
    expect(checkUrl("http://example.com:22")).toEqual({ allowed: false, reason: "disallowed_port" });
  });

  it("F17: rechaza localhost y loopback", () => {
    expect(checkUrl("http://localhost")).toEqual({ allowed: false, reason: "loopback" });
    expect(checkUrl("http://127.0.0.1")).toEqual({ allowed: false, reason: "loopback" });
    expect(checkUrl("http://127.255.255.255")).toEqual({ allowed: false, reason: "loopback" });
    expect(checkUrl("http://[::1]")).toEqual({ allowed: false, reason: "loopback" });
  });

  it("F18: rechaza las IPs de metadata cloud (AWS/GCP/Azure/DO comparten 169.254.169.254)", () => {
    expect(checkUrl("http://169.254.169.254/latest/meta-data/")).toEqual({
      allowed: false,
      reason: "cloud_metadata",
    });
    expect(checkUrl("http://[fd00:ec2::254]")).toEqual({ allowed: false, reason: "cloud_metadata" });
  });

  it("rechaza redes privadas RFC 1918", () => {
    expect(checkUrl("http://10.0.0.1")).toEqual({ allowed: false, reason: "private_range" });
    expect(checkUrl("http://172.16.0.1")).toEqual({ allowed: false, reason: "private_range" });
    expect(checkUrl("http://172.31.255.255")).toEqual({ allowed: false, reason: "private_range" });
    expect(checkUrl("http://192.168.1.1")).toEqual({ allowed: false, reason: "private_range" });
  });

  it("no confunde 172.15/172.32 (fuera de 172.16.0.0/12) con rango privado", () => {
    expect(checkUrl("http://172.15.255.255")).toEqual({ allowed: true });
    expect(checkUrl("http://172.32.0.1")).toEqual({ allowed: true });
  });

  it("rechaza link-local IPv4 (incluye el resto de 169.254.0.0/16, no solo metadata)", () => {
    expect(checkUrl("http://169.254.1.1")).toEqual({ allowed: false, reason: "link_local" });
  });

  it("rechaza IPv6 unique-local y link-local", () => {
    expect(checkUrl("http://[fc00::1]")).toEqual({ allowed: false, reason: "private_range" });
    expect(checkUrl("http://[fd12:3456::1]")).toEqual({ allowed: false, reason: "private_range" });
    expect(checkUrl("http://[fe80::1]")).toEqual({ allowed: false, reason: "link_local" });
  });

  it("rechaza IPv4-mapped IPv6 apuntando a un rango bloqueado", () => {
    expect(checkUrl("http://[::ffff:127.0.0.1]")).toEqual({ allowed: false, reason: "loopback" });
    expect(checkUrl("http://[::ffff:10.0.0.1]")).toEqual({ allowed: false, reason: "private_range" });
  });

  it("permite una IP pública normal", () => {
    expect(checkUrl("http://8.8.8.8")).toEqual({ allowed: true });
    expect(checkUrl("http://[2606:4700:4700::1111]")).toEqual({ allowed: true });
  });
});

describe("classifyAddress — casos límite de rangos", () => {
  it("::/128 (sin especificar) y ::1/128 (loopback) se distinguen", () => {
    expect(classifyAddress("::")).toBe("unspecified");
    expect(classifyAddress("::1")).toBe("loopback");
  });

  it("multicast y broadcast", () => {
    expect(classifyAddress("224.0.0.1")).toBe("multicast_or_broadcast");
    expect(classifyAddress("255.255.255.255")).toBe("multicast_or_broadcast");
    expect(classifyAddress("ff02::1")).toBe("multicast_or_broadcast");
  });

  it("rangos de documentación/benchmark (TEST-NET, 2001:db8::/32)", () => {
    expect(classifyAddress("192.0.2.1")).toBe("reserved_range");
    expect(classifyAddress("198.51.100.1")).toBe("reserved_range");
    expect(classifyAddress("203.0.113.1")).toBe("reserved_range");
    expect(classifyAddress("2001:db8::1")).toBe("reserved_range");
  });

  it("CGNAT (100.64.0.0/10) se trata como privado", () => {
    expect(classifyAddress("100.64.0.1")).toBe("private_range");
    expect(classifyAddress("100.100.100.100")).toBe("private_range");
  });

  it("un hostname que no es una IP literal no se clasifica aquí (requiere resolución DNS aparte)", () => {
    expect(classifyAddress("example.com")).toBeNull();
  });
});
