import { after } from "next/server";
import { runWorkerOnce } from "@iaxcore/pipeline";
import { getDb } from "@/lib/db";

// Extraído de app/api/scans/route.ts porque app/api/scans/[id]/rescan/route.ts
// necesita disparar exactamente el mismo tick — ver el comentario original
// sobre por qué esto vive dentro de after() en vez de un worker persistente
// (Vercel Hobby no tiene cron con la frecuencia necesaria).
export function triggerInlineWorkerTick(): void {
  const signingKeyId = process.env.SIGNING_KEY_ID;
  const signingPrivateKeyBase64 = process.env.SIGNING_PRIVATE_KEY_B64;
  if (!signingKeyId || !signingPrivateKeyBase64) {
    console.warn("SIGNING_KEY_ID/SIGNING_PRIVATE_KEY_B64 not set — scan will stay queued until a worker picks it up");
    return;
  }
  after(() =>
    runWorkerOnce(getDb(), { workerId: "vercel-inline", signingKeyId, signingPrivateKeyBase64 }).catch((error) => {
      console.error("inline worker tick failed", error);
    }),
  );
}
