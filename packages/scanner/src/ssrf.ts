// §9 (bloqueante): "bloquear localhost, redes privadas, link-local, metadata
// cloud, IPv4/IPv6 reservadas, puertos no permitidos y redirecciones hacia
// destinos prohibidos." Este módulo es el clasificador puro de direcciones;
// interceptar cada request del navegador y resolver DNS antes de conectar
// (para que esto también cubra DNS rebinding) es responsabilidad de
// packages/scanner's Playwright wrapper — todavía no construido (Fase 2
// continúa; ver ADR pendiente).

export type SsrfBlockReason =
  | "invalid_url"
  | "disallowed_protocol"
  | "disallowed_port"
  | "loopback"
  | "private_range"
  | "link_local"
  | "cloud_metadata"
  | "reserved_range"
  | "multicast_or_broadcast"
  | "unspecified";

export interface SsrfCheckResult {
  allowed: boolean;
  reason?: SsrfBlockReason;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);

// Famosos por ataques SSRF a metadata de nube (AWS/GCP/Azure/DigitalOcean
// comparten 169.254.169.254; algunos exponen también una IPv6 dedicada).
const CLOUD_METADATA_IPV4 = new Set(["169.254.169.254"]);
const CLOUD_METADATA_IPV6 = new Set(["fd00:ec2::254"]);

function parseIPv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function isIPv4InRange(octets: number[], base: number[], prefixLength: number): boolean {
  const ipInt = (octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!;
  const baseInt = (base[0]! << 24) | (base[1]! << 16) | (base[2]! << 8) | base[3]!;
  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((baseInt & mask) >>> 0);
}

// RFC 1918 (privadas), RFC 5735/6890 (loopback, link-local, reservadas,
// benchmarking, documentación, CGNAT, multicast/broadcast).
const IPV4_RANGES: Array<{ base: number[]; prefix: number; reason: SsrfBlockReason }> = [
  { base: [0, 0, 0, 0], prefix: 8, reason: "reserved_range" },
  { base: [10, 0, 0, 0], prefix: 8, reason: "private_range" },
  { base: [100, 64, 0, 0], prefix: 10, reason: "private_range" },
  { base: [127, 0, 0, 0], prefix: 8, reason: "loopback" },
  { base: [169, 254, 0, 0], prefix: 16, reason: "link_local" },
  { base: [172, 16, 0, 0], prefix: 12, reason: "private_range" },
  { base: [192, 0, 0, 0], prefix: 24, reason: "reserved_range" },
  { base: [192, 0, 2, 0], prefix: 24, reason: "reserved_range" },
  { base: [192, 88, 99, 0], prefix: 24, reason: "reserved_range" },
  { base: [192, 168, 0, 0], prefix: 16, reason: "private_range" },
  { base: [198, 18, 0, 0], prefix: 15, reason: "reserved_range" },
  { base: [198, 51, 100, 0], prefix: 24, reason: "reserved_range" },
  { base: [203, 0, 113, 0], prefix: 24, reason: "reserved_range" },
  { base: [224, 0, 0, 0], prefix: 4, reason: "multicast_or_broadcast" },
  { base: [240, 0, 0, 0], prefix: 4, reason: "reserved_range" },
  { base: [255, 255, 255, 255], prefix: 32, reason: "multicast_or_broadcast" },
];

// Más específico primero (255.255.255.255/32 antes que 240.0.0.0/4, que lo
// contiene) — si no, la primera coincidencia encontrada gana aunque sea la
// menos precisa.
const IPV4_RANGES_BY_SPECIFICITY = [...IPV4_RANGES].sort((a, b) => b.prefix - a.prefix);

function classifyIPv4(host: string): SsrfBlockReason | null {
  const octets = parseIPv4(host);
  if (!octets) return null;
  if (CLOUD_METADATA_IPV4.has(host)) return "cloud_metadata";
  for (const range of IPV4_RANGES_BY_SPECIFICITY) {
    if (isIPv4InRange(octets, range.base, range.prefix)) return range.reason;
  }
  return null;
}

// Expande "::" y devuelve 8 grupos de 16 bits como bigint, o null si no es
// una IPv6 sintácticamente válida. Suficiente para clasificar rangos — no
// pretende ser un parser RFC 4291 completo.
function parseIPv6(host: string): bigint | null {
  let normalized = host;
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  if (!normalized.includes(":")) return null;

  const doubleColonParts = normalized.split("::");
  if (doubleColonParts.length > 2) return null;

  const parseGroups = (segment: string): string[] => (segment === "" ? [] : segment.split(":"));

  let groups: string[];
  if (doubleColonParts.length === 2) {
    const head = parseGroups(doubleColonParts[0]!);
    const tail = parseGroups(doubleColonParts[1]!);
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill("0"), ...tail];
  } else {
    groups = parseGroups(normalized);
  }
  if (groups.length !== 8) return null;

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    value = (value << 16n) | BigInt(Number.parseInt(group, 16));
  }
  return value;
}

function ipv6RangeMask(prefixLength: number): bigint {
  return prefixLength === 0 ? 0n : (((1n << 128n) - 1n) << BigInt(128 - prefixLength)) & ((1n << 128n) - 1n);
}

const IPV6_RANGES: Array<{ base: bigint; prefix: number; reason: SsrfBlockReason }> = [
  { base: parseIPv6("fc00::")!, prefix: 7, reason: "private_range" }, // unique local
  { base: parseIPv6("fe80::")!, prefix: 10, reason: "link_local" },
  { base: parseIPv6("2001:db8::")!, prefix: 32, reason: "reserved_range" }, // documentation
  { base: parseIPv6("ff00::")!, prefix: 8, reason: "multicast_or_broadcast" },
];
// Mismo motivo que IPV4_RANGES_BY_SPECIFICITY: el rango más específico debe
// evaluarse primero si dos llegan a solaparse.
const IPV6_RANGES_BY_SPECIFICITY = [...IPV6_RANGES].sort((a, b) => b.prefix - a.prefix);

function classifyIPv6(host: string): SsrfBlockReason | null {
  const value = parseIPv6(host);
  if (value === null) return null;

  if (value === 0n) return "unspecified"; // ::
  if (value === 1n) return "loopback"; // ::1

  // IPv4-mapped (::ffff:a.b.c.d) — reclasificar como la IPv4 que envuelve,
  // que es la dirección que realmente se usaría al conectar. Los 96 bits
  // altos de un ::ffff:a.b.c.d son 0000...0000:ffff, así que descartar los
  // 32 bits bajos (la propia IPv4) debe dejar exactamente 0xffff.
  if (value >> 32n === 0xffffn) {
    const ipv4Int = Number(value & 0xffffffffn);
    const octets = [
      (ipv4Int >>> 24) & 0xff,
      (ipv4Int >>> 16) & 0xff,
      (ipv4Int >>> 8) & 0xff,
      ipv4Int & 0xff,
    ];
    for (const range of IPV4_RANGES) {
      if (isIPv4InRange(octets, range.base, range.prefix)) return range.reason;
    }
    return null;
  }

  if (CLOUD_METADATA_IPV6.has(host.toLowerCase())) return "cloud_metadata";

  for (const range of IPV6_RANGES_BY_SPECIFICITY) {
    if ((value & ipv6RangeMask(range.prefix)) === (range.base & ipv6RangeMask(range.prefix))) {
      return range.reason;
    }
  }
  return null;
}

/**
 * Clasifica una dirección IP literal (v4 o v6) ya resuelta. No hace lookup
 * de DNS — eso es responsabilidad del caller, precisamente para poder
 * revalidar la IP real a la que se conecta y no solo el hostname (protección
 * contra DNS rebinding, ver F17/fixtures de Fase 2).
 */
export function classifyAddress(host: string): SsrfBlockReason | null {
  if (host === "localhost") return "loopback";
  return classifyIPv4(host) ?? classifyIPv6(host);
}

/**
 * Chequeo de una URL antes de navegar: protocolo, puerto, y si el hostname
 * es directamente una IP en un rango bloqueado. Si el hostname es un nombre
 * (no una IP literal), esta función NO resuelve DNS — `allowed: true` aquí
 * no es la palabra final; el caller debe resolver y volver a comprobar la IP
 * real con `classifyAddress()` antes de conectar.
 */
export function checkUrl(rawUrl: string): SsrfCheckResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "invalid_url" };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { allowed: false, reason: "disallowed_protocol" };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { allowed: false, reason: "disallowed_port" };
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const reason = classifyAddress(hostname);
  if (reason) {
    return { allowed: false, reason };
  }
  return { allowed: true };
}
