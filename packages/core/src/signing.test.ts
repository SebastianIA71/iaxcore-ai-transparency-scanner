import { describe, expect, it } from "vitest";
import { generateSigningKeyPair, signCanonicalJson, verifyCanonicalJsonSignature } from "./signing.js";

describe("firma Ed25519 del JSON canónico (§8, §19)", () => {
  it("una firma válida verifica correctamente con la clave pública correspondiente", () => {
    const keyPair = generateSigningKeyPair("key_2026_1");
    const report = { evaluationId: "eval_1", status: "completed", pagesAnalyzed: 4 };

    const signature = signCanonicalJson(keyPair.privateKeyBase64, report);

    expect(verifyCanonicalJsonSignature(keyPair.publicKeyBase64, report, signature)).toBe(true);
  });

  it("el orden de las claves del objeto no cambia la firma (canonicalización)", () => {
    const keyPair = generateSigningKeyPair("key_2026_1");
    const a = { evaluationId: "eval_1", status: "completed" };
    const b = { status: "completed", evaluationId: "eval_1" };

    const signature = signCanonicalJson(keyPair.privateKeyBase64, a);

    expect(verifyCanonicalJsonSignature(keyPair.publicKeyBase64, b, signature)).toBe(true);
  });

  it("cualquier cambio en el contenido invalida la firma", () => {
    const keyPair = generateSigningKeyPair("key_2026_1");
    const report = { evaluationId: "eval_1", status: "completed" };
    const signature = signCanonicalJson(keyPair.privateKeyBase64, report);

    const tampered = { evaluationId: "eval_1", status: "aligned" };
    expect(verifyCanonicalJsonSignature(keyPair.publicKeyBase64, tampered, signature)).toBe(false);
  });

  it("una firma hecha con otra clave privada no verifica", () => {
    const keyPairA = generateSigningKeyPair("key_2026_1");
    const keyPairB = generateSigningKeyPair("key_2026_2");
    const report = { evaluationId: "eval_1" };

    const signature = signCanonicalJson(keyPairA.privateKeyBase64, report);

    expect(verifyCanonicalJsonSignature(keyPairB.publicKeyBase64, report, signature)).toBe(false);
  });

  it("una firma con formato corrupto no verifica (no lanza)", () => {
    const keyPair = generateSigningKeyPair("key_2026_1");
    expect(verifyCanonicalJsonSignature(keyPair.publicKeyBase64, { a: 1 }, "not-base64-signature!!")).toBe(false);
  });
});
