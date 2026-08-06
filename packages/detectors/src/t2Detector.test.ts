import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runT2Detection } from "./t2Detector.js";
import { listenOnPort80 } from "./testHelpers.js";

// Mismo truco que t1Detector.test.ts — ver ese fichero para la explicación.
const FAKE_PUBLIC_HOSTNAME = "iaxcore-t2-test.test";
const FAKE_PUBLIC_IP = "93.184.216.34";
const ORIGIN = `http://${FAKE_PUBLIC_HOSTNAME}`;
const T2_OPTIONS = {
  resolveHostname: async () => FAKE_PUBLIC_IP,
  launchArgs: [`--host-resolver-rules=MAP ${FAKE_PUBLIC_HOSTNAME} 127.0.0.1`],
};

const PAGES: Record<string, string> = {
  // F: etiqueta junto a una imagen, vía <figcaption>.
  "/image-label": `<html><body>
    <figure>
      <img src="/cat.jpg" alt="foto de un gato" />
      <figcaption>Imagen generada con IA</figcaption>
    </figure>
  </body></html>`,

  // F: etiqueta junto a un vídeo, vía <figcaption>.
  "/video-label": `<html><body>
    <figure>
      <video src="/clip.mp4"></video>
      <figcaption>Vídeo generado con IA</figcaption>
    </figure>
  </body></html>`,

  // F: etiqueta directamente en el atributo alt (sin <figure>).
  "/alt-label": `<html><body>
    <img src="/illustration.jpg" alt="AI-generated illustration of a cat" />
  </body></html>`,

  // Ausencia: imagen, vídeo y figure normales, sin ninguna etiqueta de IA.
  "/no-labels": `<html><body>
    <img src="/cat.jpg" alt="a photo of a cat" />
    <video src="/clip.mp4"></video>
    <figure>
      <img src="/dog.jpg" alt="a dog" />
      <figcaption>Photo credit: Jane Doe, 2024</figcaption>
    </figure>
  </body></html>`,

  // F12: texto editorial que menciona IA en un párrafo normal, fuera de
  // cualquier figure/figcaption/alt — no debe contar como etiqueta.
  "/editorial-false-positive": `<html><body>
    <article>
      <h1>How AI-generated content is reshaping journalism</h1>
      <p>
        In this piece we explore how AI-generated content is changing the way
        newsrooms operate, and why platforms are increasingly relying on
        generated with AI tools to draft first versions of routine stories.
      </p>
    </article>
  </body></html>`,

};

describe("runT2Detection — §5.2/§10-Fase 5: T2 de extremo a extremo contra fixtures", () => {
  let server: Server;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const body = PAGES[req.url ?? "/"];
      if (!body) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    });
    await listenOnPort80(server);
  }, 30_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function firstFinding(result: Awaited<ReturnType<typeof runT2Detection>>) {
    return result.findings.find((f) => f.detectorId === "t2.visible_labelling");
  }

  it("etiqueta junto a una imagen (figcaption) → detected, sin assessmentStatus", async () => {
    const result = await runT2Detection("eval_1", `${ORIGIN}/image-label`, T2_OPTIONS);
    const finding = firstFinding(result);
    expect(finding).toMatchObject({ observationStatus: "detected", confidenceBand: "high" });
    expect(finding?.assessmentStatus).toBeUndefined();
    expect(finding?.detail.count).toBe(1);
    expect(finding?.detail.signals).toEqual([{ location: "figcaption", matchedText: "Imagen generada con IA" }]);
  }, 30_000);

  it("etiqueta junto a un vídeo (figcaption) → detected", async () => {
    const result = await runT2Detection("eval_1", `${ORIGIN}/video-label`, T2_OPTIONS);
    const finding = firstFinding(result);
    expect(finding).toMatchObject({ observationStatus: "detected" });
    expect(finding?.detail.signals).toEqual([{ location: "figcaption", matchedText: "Vídeo generado con IA" }]);
  }, 30_000);

  it("etiqueta en el atributo alt, sin figure → detected", async () => {
    const result = await runT2Detection("eval_1", `${ORIGIN}/alt-label`, T2_OPTIONS);
    const finding = firstFinding(result);
    expect(finding).toMatchObject({ observationStatus: "detected" });
    expect(finding?.detail.signals).toEqual([
      { location: "alt", matchedText: "AI-generated illustration of a cat" },
    ]);
  }, 30_000);

  it("ausencia de etiquetas → not_detected, nunca action_recommended (§5.2 regla dura)", async () => {
    const result = await runT2Detection("eval_1", `${ORIGIN}/no-labels`, T2_OPTIONS);
    const finding = firstFinding(result);
    expect(finding).toMatchObject({ observationStatus: "not_detected" });
    expect(finding?.detail.count).toBe(0);
    expect(finding?.assessmentStatus).toBeUndefined();
  }, 30_000);

  it("F12: texto editorial que menciona IA fuera de una figura/figcaption/alt no cuenta como etiqueta", async () => {
    const result = await runT2Detection("eval_1", `${ORIGIN}/editorial-false-positive`, T2_OPTIONS);
    const finding = firstFinding(result);
    expect(finding).toMatchObject({ observationStatus: "not_detected" });
    expect(finding?.detail.count).toBe(0);
  }, 30_000);

  it("contenido inaccesible (404) → error, nunca action_recommended", async () => {
    const result = await runT2Detection("eval_1", `${ORIGIN}/not-found`, T2_OPTIONS);
    const finding = firstFinding(result);
    expect(finding).toMatchObject({ observationStatus: "error" });
    expect(finding?.assessmentStatus).toBeUndefined();
  }, 30_000);

  it("URL que ya viola SSRF de entrada → error, sin abrir navegador", async () => {
    const result = await runT2Detection("eval_1", "http://127.0.0.1/", {});
    expect(firstFinding(result)).toMatchObject({ observationStatus: "error" });
  });
});
