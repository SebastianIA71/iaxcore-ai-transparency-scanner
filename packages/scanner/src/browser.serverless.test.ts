import { afterEach, describe, expect, it } from "vitest";
import { isServerlessRuntime } from "./browser.js";

// Solo prueba la decisión de qué Chromium usar — el camino serverless en sí
// (el binario de @sparticuz/chromium) está compilado para Amazon Linux y no
// puede ejecutarse en una máquina de desarrollo; ver el comentario junto a
// isServerlessRuntime() en browser.ts.
describe("isServerlessRuntime — decide entre playwright (dev) y @sparticuz/chromium (Vercel/Lambda)", () => {
  const originalVercel = process.env.VERCEL;
  const originalLambda = process.env.AWS_LAMBDA_FUNCTION_NAME;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
    if (originalLambda === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    else process.env.AWS_LAMBDA_FUNCTION_NAME = originalLambda;
  });

  it("false en un entorno de desarrollo normal", () => {
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    expect(isServerlessRuntime()).toBe(false);
  });

  it("true cuando VERCEL está presente (Vercel Functions lo fija automáticamente)", () => {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.VERCEL = "1";
    expect(isServerlessRuntime()).toBe(true);
  });

  it("true cuando AWS_LAMBDA_FUNCTION_NAME está presente", () => {
    delete process.env.VERCEL;
    process.env.AWS_LAMBDA_FUNCTION_NAME = "some-function";
    expect(isServerlessRuntime()).toBe(true);
  });
});
