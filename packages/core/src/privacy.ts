import { createHash } from "node:crypto";

// §9: rate limiting por IP en POST /api/scans sin guardar la IP en claro —
// solo su hash, suficiente para contar/comparar sin poder reconstruirla.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
