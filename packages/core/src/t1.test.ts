import { describe, expect, it } from "vitest";
import { ASSESSMENT_STATUSES, OBSERVATION_STATUSES } from "./vocabulary.js";
import { deriveT1Assessment, type T1AiEvidenceFinding, type T1ChannelFinding, type T1DisclosureFinding } from "./t1.js";

const channel = (
  observationStatus: T1ChannelFinding["observationStatus"],
  human_intermediary_detected = false,
): T1ChannelFinding => ({ observationStatus, detail: { human_intermediary_detected } });

const aiEvidence = (
  observationStatus: T1AiEvidenceFinding["observationStatus"],
  evidence_of_human?: boolean,
): T1AiEvidenceFinding => ({ observationStatus, detail: { evidence_of_human } });

const disclosure = (observationStatus: T1DisclosureFinding["observationStatus"]): T1DisclosureFinding => ({
  observationStatus,
  detail: {},
});

describe("deriveT1Assessment — tabla de derivación §5.1", () => {
  it("F06: sin canal conversacional → not_applicable", () => {
    expect(deriveT1Assessment(channel("not_detected"))).toBe("not_applicable");
  });

  it("F21: canal deriva a intermediario humano → not_applicable", () => {
    expect(deriveT1Assessment(channel("not_detected", true))).toBe("not_applicable");
  });

  it("F22: canal exclusivamente máquina-a-máquina → not_applicable", () => {
    expect(deriveT1Assessment(channel("not_detected", false))).toBe("not_applicable");
  });

  it("F04: chat humano explícito (evidence_of_human) → not_applicable, nunca insufficient_evidence", () => {
    expect(deriveT1Assessment(channel("detected"), aiEvidence("not_detected", true))).toBe("not_applicable");
  });

  it("F05: ambigüedad real, sin evidencia de humano ni de IA → insufficient_evidence", () => {
    expect(deriveT1Assessment(channel("detected"), aiEvidence("not_detected", false))).toBe(
      "insufficient_evidence",
    );
    expect(deriveT1Assessment(channel("detected"), aiEvidence("not_detected"))).toBe("insufficient_evidence");
  });

  it("F01/F02: canal + IA + aviso, todo detectado → aligned", () => {
    expect(deriveT1Assessment(channel("detected"), aiEvidence("detected"), disclosure("detected"))).toBe("aligned");
  });

  it("F02b/F03: canal + IA detectados, aviso ausente antes del primer input → action_recommended", () => {
    expect(deriveT1Assessment(channel("detected"), aiEvidence("detected"), disclosure("not_detected"))).toBe(
      "action_recommended",
    );
  });

  it("F07: widget no inspeccionable (not_assessable) → insufficient_evidence", () => {
    expect(deriveT1Assessment(channel("not_assessable"))).toBe("insufficient_evidence");
  });

  it("escáner bloqueado o falla (error) → insufficient_evidence", () => {
    expect(deriveT1Assessment(channel("error"))).toBe("insufficient_evidence");
  });

  it("regla de autonomía §7: combinación no tabulada nunca lanza, cae en insufficient_evidence", () => {
    expect(deriveT1Assessment(channel("detected"))).toBe("insufficient_evidence");
    expect(deriveT1Assessment(channel("detected"), aiEvidence("detected"))).toBe("insufficient_evidence");
  });
});

describe("vocabulario cerrado §6", () => {
  it("'warning' no existe como observationStatus ni assessmentStatus", () => {
    expect(OBSERVATION_STATUSES).not.toContain("warning");
    expect(ASSESSMENT_STATUSES).not.toContain("warning");
  });
});
