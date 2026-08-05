import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { canonicalizeForSigning } from "./canonicalize.js";

// §8/§19: "fírmalo con Ed25519 (keyId versionado, clave pública en
// /.well-known/iaxcore-keys.json)". Se firma únicamente el JSON canónico del
// informe — nunca el PDF (§8). Las claves se codifican en base64 de su forma
// DER estándar (SPKI/PKCS8) para que sean JSON-safe y portables entre Node y
// cualquier verificador externo (v1.1, verificación offline — §14, §18).
export interface SigningKeyPair {
  keyId: string;
  publicKeyBase64: string;
  privateKeyBase64: string;
}

export function generateSigningKeyPair(keyId: string): SigningKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    keyId,
    publicKeyBase64: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKeyBase64: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

export function signCanonicalJson(privateKeyBase64: string, value: unknown): string {
  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const canonical = canonicalizeForSigning(value);
  return sign(null, Buffer.from(canonical, "utf8"), privateKey).toString("base64");
}

export function verifyCanonicalJsonSignature(
  publicKeyBase64: string,
  value: unknown,
  signatureBase64: string,
): boolean {
  const publicKey = createPublicKey({
    key: Buffer.from(publicKeyBase64, "base64"),
    format: "der",
    type: "spki",
  });
  const canonical = canonicalizeForSigning(value);
  try {
    return verify(null, Buffer.from(canonical, "utf8"), publicKey, Buffer.from(signatureBase64, "base64"));
  } catch {
    // Firma con formato inválido/corrupto — no verificable, no es un error del caller.
    return false;
  }
}
