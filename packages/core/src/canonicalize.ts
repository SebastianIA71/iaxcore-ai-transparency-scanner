// §8: "packages/core ... canonicalización." La firma Ed25519 (Fase 1) firma
// este string, no el objeto JS — por eso el orden de claves debe ser determinista
// y estable entre ejecuciones, lenguajes y versiones de Node.

export function canonicalizeForSigning(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
