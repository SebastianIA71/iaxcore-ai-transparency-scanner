import { NextResponse } from "next/server";

// §8/§14: "clave pública publicada en /.well-known/iaxcore-keys.json y
// mostrada en /verify" — la contraparte pública de SIGNING_PRIVATE_KEY_B64,
// nunca la propia clave privada. Formato de array porque §8 versiona
// keyId — una rotación futura solo añade una entrada, no reemplaza esta.
export async function GET() {
  const keyId = process.env.SIGNING_KEY_ID;
  const publicKeyBase64 = process.env.SIGNING_PUBLIC_KEY_B64;

  if (!keyId || !publicKeyBase64) {
    return NextResponse.json({ keys: [] }, { status: 200 });
  }

  return NextResponse.json({
    keys: [{ keyId, publicKeyBase64, algorithm: "Ed25519" }],
  });
}
