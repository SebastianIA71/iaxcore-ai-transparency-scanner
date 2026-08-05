import { createServer, type Server } from "node:http";
import { generateAiDisclosureFix } from "@iaxcore/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runT1Detection } from "./t1Detector.js";
import { listenOnPort80 } from "./testHelpers.js";

// Mismo truco que packages/scanner/src/scan.test.ts: un hostname que no es
// una IP literal (checkUrl() no lo rechaza de entrada) resuelto a
// 127.0.0.1 solo para este proceso de Chromium vía --host-resolver-rules,
// con un resolveHostname inyectado que le hace creer al guard SSRF que la
// IP es pública. checkUrl() exige puerto 80/443/ninguno, de ahí el
// servidor real en el 80.
const FAKE_PUBLIC_HOSTNAME = "iaxcore-t1-test.test";
const FAKE_PUBLIC_IP = "93.184.216.34";
const ORIGIN = `http://${FAKE_PUBLIC_HOSTNAME}`;
const T1_OPTIONS = {
  resolveHostname: async () => FAKE_PUBLIC_IP,
  launchArgs: [`--host-resolver-rules=MAP ${FAKE_PUBLIC_HOSTNAME} 127.0.0.1`],
};

// Un botón con el mismo texto en todos los fixtures — así se aísla lo que
// cada test prueba (el contenido revelado tras abrirlo) de la detección
// del propio lanzador, que ya tiene su cobertura genérica aquí también
// (fixture "no-channel").
function widgetPage(options: { revealText?: string; wireClick?: boolean; extraHead?: string } = {}): string {
  const { revealText, wireClick = true, extraHead = "" } = options;
  return `<html><head>${extraHead}</head><body>
    <button aria-label="Chat with us">Chat with us</button>
    <div id="panel" style="display:none">${revealText ?? ""}</div>
    <script>
      ${
        wireClick
          ? `document.querySelector("button").addEventListener("click", () => {
        document.getElementById("panel").style.display = "block";
      });`
          : ""
      }
    </script>
  </body></html>`;
}

const PAGES: Record<string, string> = {
  "/no-channel": "<html><body><p>Solo texto, sin ningún botón.</p></body></html>",

  "/human-intermediary": widgetPage({
    revealText: "Thanks for reaching out — we'll get back to you within 24 hours by email.",
  }),

  "/human-chat": widgetPage({
    revealText: "You're chatting with our support team — a real person will be with you shortly.",
  }),

  "/ambiguous": widgetPage({ revealText: "Hi there! How can I help you today?" }),

  "/ai-disclosed": widgetPage({
    revealText: "Hi! You are now chatting with an AI assistant. How can I help?",
  }),

  "/ai-no-disclosure": widgetPage({
    revealText: "Hi! I'm here to help using our AI-powered chatbot, available any time.",
  }),

  // §10-Fase 4, gate de salida: mismo texto que "/ai-no-disclosure"
  // (action_recommended), con el aviso de generateAiDisclosureFix()
  // antepuesto — simula que quien opera el sitio aplicó el fix tal cual lo
  // generó el motor, sin reemplazar el mensaje que ya tenía.
  "/ai-no-disclosure-fixed": widgetPage({
    revealText: `${generateAiDisclosureFix("en").noticeText} Hi! I'm here to help using our AI-powered chatbot, available any time.`,
  }),

  "/ai-vendor": widgetPage({
    revealText: "Hi! How can I help you today?",
    extraHead: `<script>window.adaEmbed = {}; window.adaSettings = {};</script>`,
  }),

  "/unopenable": widgetPage({ wireClick: false }),
};

describe("runT1Detection — §5.1/§10-Fase 3: T1 de extremo a extremo contra fixtures", () => {
  let server: Server;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const body = PAGES[req.url ?? "/"];
      if (!body) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(body);
    });
    await listenOnPort80(server);
  }, 30_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function findingFor(result: Awaited<ReturnType<typeof runT1Detection>>, detectorId: string) {
    return result.findings.find((f) => f.detectorId === detectorId);
  }

  it("sin ningún canal → t1.channel not_detected, assessment not_applicable", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/no-channel`, T1_OPTIONS);
    expect(findingFor(result, "t1.channel")).toMatchObject({
      observationStatus: "not_detected",
      detail: { human_intermediary_detected: false },
    });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "not_applicable" });
    expect(findingFor(result, "t1.ai_evidence")).toBeUndefined();
  }, 30_000);

  it("F21: intermediario humano asíncrono → t1.channel not_detected + human_intermediary_detected, not_applicable", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/human-intermediary`, T1_OPTIONS);
    expect(findingFor(result, "t1.channel")).toMatchObject({
      observationStatus: "not_detected",
      detail: { human_intermediary_detected: true },
    });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "not_applicable" });
  }, 30_000);

  it("F04: chat humano explícito → ai_evidence not_detected con evidence_of_human, not_applicable (nunca insufficient_evidence)", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/human-chat`, T1_OPTIONS);
    expect(findingFor(result, "t1.channel")).toMatchObject({ observationStatus: "detected" });
    expect(findingFor(result, "t1.ai_evidence")).toMatchObject({
      observationStatus: "not_detected",
      detail: { evidence_of_human: true },
    });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "not_applicable" });
  }, 30_000);

  it("F05: ambigüedad real, sin evidencia de humano ni de IA → insufficient_evidence", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/ambiguous`, T1_OPTIONS);
    expect(findingFor(result, "t1.ai_evidence")).toMatchObject({
      observationStatus: "not_detected",
      detail: { evidence_of_human: false },
    });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "insufficient_evidence" });
  }, 30_000);

  it("F02: canal + IA + aviso explícito al abrir → aligned, disclosure_timing on_open", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/ai-disclosed`, T1_OPTIONS);
    expect(findingFor(result, "t1.ai_evidence")).toMatchObject({ observationStatus: "detected" });
    expect(findingFor(result, "t1.disclosure")).toMatchObject({
      observationStatus: "detected",
      detail: { disclosure_timing: "on_open" },
    });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "aligned" });
  }, 30_000);

  it("F03: canal + IA detectados, sin aviso → action_recommended con context_exceptions_note y obviousness_signals", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/ai-no-disclosure`, T1_OPTIONS);
    const disclosure = findingFor(result, "t1.disclosure");
    expect(disclosure).toMatchObject({
      observationStatus: "not_detected",
      detail: { disclosure_timing: "n/a", context_exceptions_note: true },
    });
    expect(disclosure?.detail.obviousness_signals).toMatchObject({
      initial_message_sample: expect.any(String),
      assistant_avatar_type: "none",
    });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "action_recommended" });
  }, 30_000);

  it("§10-Fase 4, gate de salida: aplicar generateAiDisclosureFix() cambia la evaluación de action_recommended a aligned, en una corrida independiente de la anterior", async () => {
    const before = await runT1Detection("eval_before_fix", `${ORIGIN}/ai-no-disclosure`, T1_OPTIONS);
    const after = await runT1Detection("eval_after_fix", `${ORIGIN}/ai-no-disclosure-fixed`, T1_OPTIONS);

    expect(findingFor(before, "t1.assessment")).toMatchObject({ assessmentStatus: "action_recommended" });
    expect(findingFor(after, "t1.assessment")).toMatchObject({ assessmentStatus: "aligned" });
    expect(findingFor(after, "t1.disclosure")).toMatchObject({
      observationStatus: "detected",
      detail: { disclosure_timing: "on_open" },
    });

    // "sin editar la evaluación anterior" — dos corridas independientes,
    // cada una con su propio evaluationId; runT1Detection no comparte
    // estado entre llamadas (cada una abre su propio navegador/página).
    expect(before.findings.every((f) => f.evaluationId === "eval_before_fix")).toBe(true);
    expect(after.findings.every((f) => f.evaluationId === "eval_after_fix")).toBe(true);
  }, 30_000);

  it("proveedor ai_native conocido (firma por variable global) clasifica ai_evidence sin depender del texto del panel", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/ai-vendor`, T1_OPTIONS);
    expect(findingFor(result, "t1.channel")).toMatchObject({ detail: { vendor: "Ada" } });
    expect(findingFor(result, "t1.ai_evidence")).toMatchObject({ observationStatus: "detected", confidenceBand: "high" });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "action_recommended" });
  }, 30_000);

  it("F07: widget presente pero no se puede abrir → not_assessable, insufficient_evidence", async () => {
    const result = await runT1Detection("eval_1", `${ORIGIN}/unopenable`, T1_OPTIONS);
    expect(findingFor(result, "t1.channel")).toMatchObject({ observationStatus: "not_assessable" });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "insufficient_evidence" });
    expect(findingFor(result, "t1.ai_evidence")).toBeUndefined();
  }, 30_000);

  it("URL que ya viola SSRF de entrada → error, insufficient_evidence, sin abrir navegador", async () => {
    const result = await runT1Detection("eval_1", "http://127.0.0.1/", {});
    expect(findingFor(result, "t1.channel")).toMatchObject({ observationStatus: "error" });
    expect(findingFor(result, "t1.assessment")).toMatchObject({ assessmentStatus: "insufficient_evidence" });
  });
});
