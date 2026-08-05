import { describe, expect, it } from "vitest";
import {
  evaluationSchema,
  evidenceSchema,
  findingSchema,
  leadSchema,
  reportArtifactSchema,
  scanJobSchema,
  shareLinkSchema,
} from "./entities.js";

describe("Finding — §15", () => {
  it("acepta un t1.channel válido con human_intermediary_detected (F21)", () => {
    const result = findingSchema.safeParse({
      evaluationId: "eval_1",
      detectorId: "t1.channel",
      observationStatus: "not_detected",
      confidenceBand: "high",
      summaryKey: "t1_channel_human_intermediary",
      detail: { human_intermediary_detected: true },
    });
    expect(result.success).toBe(true);
  });

  it("acepta el finding agregado t1.assessment con assessmentStatus", () => {
    const result = findingSchema.safeParse({
      evaluationId: "eval_1",
      detectorId: "t1.assessment",
      observationStatus: "detected",
      assessmentStatus: "action_recommended",
      confidenceBand: "high",
      summaryKey: "t1_assessment_action_recommended",
      detail: {},
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un detectorId fuera del vocabulario cerrado", () => {
    const result = findingSchema.safeParse({
      evaluationId: "eval_1",
      detectorId: "t1.made_up",
      observationStatus: "detected",
      confidenceBand: "high",
      summaryKey: "x",
      detail: {},
    });
    expect(result.success).toBe(false);
  });

  it("rechaza observationStatus 'warning' (no existe en el vocabulario)", () => {
    const result = findingSchema.safeParse({
      evaluationId: "eval_1",
      detectorId: "t1.disclosure",
      observationStatus: "warning",
      confidenceBand: "high",
      summaryKey: "x",
      detail: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("Evaluation / Evidence / ReportArtifact / ShareLink / Lead — §15", () => {
  it("acepta una Evaluation mínima válida", () => {
    const result = evaluationSchema.safeParse({
      id: "eval_1",
      requestedUrl: "https://example.com",
      status: "completed",
      methodVersion: "iaxcore-ai-transparency@0.1.0",
      createdAt: "2026-08-04T10:00:00.000Z",
      updatedAt: "2026-08-04T10:05:00.000Z",
      pagesRequested: 5,
      pagesAnalyzed: 4,
      manifest: { consent_interaction: "accepted_banner" },
    });
    expect(result.success).toBe(true);
  });

  it("rechaza una Evaluation con requestedUrl inválida", () => {
    const result = evaluationSchema.safeParse({
      id: "eval_1",
      requestedUrl: "not-a-url",
      status: "completed",
      methodVersion: "iaxcore-ai-transparency@0.1.0",
      createdAt: "2026-08-04T10:00:00.000Z",
      updatedAt: "2026-08-04T10:05:00.000Z",
      pagesRequested: 5,
      pagesAnalyzed: 4,
      manifest: {},
    });
    expect(result.success).toBe(false);
  });

  it("acepta una Evidence mínima con purga aplicada (sin storagePath, con contentHash)", () => {
    const result = evidenceSchema.safeParse({
      findingId: "finding_1",
      kind: "screenshot",
      location: "chat-widget",
      observedAt: "2026-08-04T10:00:00.000Z",
      contentHash: "sha256:abc123",
      method: "playwright",
      origin: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("acepta un ReportArtifact json firmado y un pdf sin firma (§8)", () => {
    expect(
      reportArtifactSchema.safeParse({
        evaluationId: "eval_1",
        format: "json",
        canonicalHash: "sha256:abc",
        signature: "ed25519:...",
        keyId: "key_2026_1",
        createdAt: "2026-08-04T10:05:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      reportArtifactSchema.safeParse({
        evaluationId: "eval_1",
        format: "pdf",
        canonicalHash: "sha256:abc",
        createdAt: "2026-08-04T10:05:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("acepta un ShareLink válido", () => {
    const result = shareLinkSchema.safeParse({
      reportArtifactId: "artifact_1",
      tokenHash: "sha256:def",
      expiresAt: "2026-11-02T10:05:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un Lead con email inválido", () => {
    const result = leadSchema.safeParse({
      email: "not-an-email",
      evaluationId: "eval_1",
      consent: {},
      priceInterestClicked: false,
      createdAt: "2026-08-04T10:05:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("acepta un ScanJob válido", () => {
    const result = scanJobSchema.safeParse({
      evaluationId: "eval_1",
      attempts: 0,
      maxAttempts: 3,
      availableAt: "2026-08-04T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
