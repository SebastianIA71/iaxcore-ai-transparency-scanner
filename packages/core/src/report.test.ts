import { describe, expect, it } from "vitest";
import { canonicalizeForSigning } from "./canonicalize.js";
import { buildCanonicalReport } from "./report.js";
import type { Finding } from "./entities.js";

const CHANNEL_FINDING: Finding = {
  evaluationId: "eval_1",
  detectorId: "t1.channel",
  observationStatus: "not_detected",
  confidenceBand: "medium",
  summaryKey: "t1.channel.not_detected",
  detail: { human_intermediary_detected: false },
};

const ASSESSMENT_FINDING: Finding = {
  evaluationId: "eval_1",
  detectorId: "t1.assessment",
  observationStatus: "not_detected",
  assessmentStatus: "not_applicable",
  confidenceBand: "medium",
  summaryKey: "t1.assessment.not_applicable",
  detail: {},
};

describe("buildCanonicalReport — §8/§19: forma exacta del payload firmado", () => {
  it("incluye evaluationId/requestedUrl/methodVersion y mapea cada finding sin evaluationId/id/createdAt", () => {
    const report = buildCanonicalReport({
      evaluationId: "eval_1",
      requestedUrl: "https://example.com/",
      methodVersion: "v1",
      findings: [CHANNEL_FINDING, ASSESSMENT_FINDING],
    });

    expect(report.evaluationId).toBe("eval_1");
    expect(report.requestedUrl).toBe("https://example.com/");
    expect(report.methodVersion).toBe("v1");
    expect(report.findings).toEqual([
      {
        detectorId: "t1.channel",
        observationStatus: "not_detected",
        assessmentStatus: undefined,
        confidenceBand: "medium",
        summaryKey: "t1.channel.not_detected",
        detail: { human_intermediary_detected: false },
      },
      {
        detectorId: "t1.assessment",
        observationStatus: "not_detected",
        assessmentStatus: "not_applicable",
        confidenceBand: "medium",
        summaryKey: "t1.assessment.not_applicable",
        detail: {},
      },
    ]);
  });

  it("es determinista: mismos findings producen el mismo JSON canónico dos veces", () => {
    const build = () =>
      buildCanonicalReport({
        evaluationId: "eval_1",
        requestedUrl: "https://example.com/",
        methodVersion: "v1",
        findings: [CHANNEL_FINDING, ASSESSMENT_FINDING],
      });

    expect(canonicalizeForSigning(build())).toBe(canonicalizeForSigning(build()));
  });

  it("sin findings, produce un array vacío (evaluación fallida antes de detectar nada)", () => {
    const report = buildCanonicalReport({
      evaluationId: "eval_1",
      requestedUrl: "https://example.com/",
      methodVersion: "v1",
      findings: [],
    });
    expect(report.findings).toEqual([]);
  });
});
