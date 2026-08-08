import { NextRequest } from "next/server";

// Extraído de app/api/scans/route.ts — app/api/scans/[id]/rescan/route.ts
// necesita el mismo hash de IP para pasar por el mismo rate limit.
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
