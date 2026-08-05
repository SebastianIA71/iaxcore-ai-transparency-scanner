import {
  deriveT1Assessment,
  type Detector,
  type DetectorContext,
  type DetectorResult,
  type EvidenceConfidenceBand,
  type Finding,
  type T1AiEvidenceFinding,
  type T1ChannelFinding,
  type T1DisclosureFinding,
} from "@iaxcore/core";
import {
  checkUrl,
  createSecureContext,
  installSsrfGuard,
  launchSecureBrowser,
  type HostnameResolver,
  type SsrfGuardLimits,
} from "@iaxcore/scanner";
import { detectAndOpenChannel } from "./channel.js";
import { buildObviousnessSignals, classifyAiEvidence, classifyDisclosure } from "./classification.js";

const NAVIGATION_TIMEOUT_MS = 15_000;

function finding(
  evaluationId: string,
  detectorId: Finding["detectorId"],
  observationStatus: Finding["observationStatus"],
  confidenceBand: EvidenceConfidenceBand,
  summaryKey: string,
  detail: Record<string, unknown>,
  assessmentStatus?: Finding["assessmentStatus"],
): Finding {
  return {
    evaluationId,
    detectorId,
    observationStatus,
    confidenceBand,
    summaryKey,
    detail,
    ...(assessmentStatus ? { assessmentStatus } : {}),
  };
}

// t1.assessment no tiene un observationStatus propio en la spec (§5.1 solo
// define su assessmentStatus, vía la tabla de derivación) — se hereda el de
// t1.channel, que es quien decide si hubo algo que el control, en
// conjunto, llegó a observar: sin canal no hay nada que observar; con
// canal, el agregado refleja esa misma observación de base.
function buildAssessmentFinding(
  evaluationId: string,
  channelFinding: Finding,
  assessmentStatus: NonNullable<Finding["assessmentStatus"]>,
): Finding {
  return finding(
    evaluationId,
    "t1.assessment",
    channelFinding.observationStatus,
    channelFinding.confidenceBand,
    `t1.assessment.${assessmentStatus}`,
    {},
    assessmentStatus,
  );
}

// §5.1: "escáner bloqueado o falla (error) → insufficient_evidence" — mismo
// tratamiento tanto si la URL ya viola SSRF (no debería, finalUrl ya pasó
// por el guard de packages/scanner al escanearla, pero un detector no debe
// asumirlo) como si la navegación falla o no devuelve 2xx.
function buildErrorResult(evaluationId: string): DetectorResult {
  const t1Channel: T1ChannelFinding = { observationStatus: "error", detail: { human_intermediary_detected: false } };
  const channelFinding = finding(evaluationId, "t1.channel", "error", "low", "t1.channel.error", { ...t1Channel.detail });
  const assessment = deriveT1Assessment(t1Channel);
  return { findings: [channelFinding, buildAssessmentFinding(evaluationId, channelFinding, assessment)] };
}

export interface T1DetectionOptions {
  resolveHostname?: HostnameResolver;
  guardLimits?: SsrfGuardLimits;
  launchArgs?: string[];
}

/**
 * §5.1/§10-Fase 3: T1 · AI Interaction Disclosure. Navega de forma
 * independiente a `finalUrl` (no reutiliza la navegación de `runScan()` —
 * packages/core no puede depender de Playwright, así que el contrato
 * `Detector` no puede llevar una `Page` en su contexto; cada detector es un
 * módulo independiente que abre su propia página segura, como describe
 * §8), busca un canal de interacción, lo abre de forma pasiva y produce los
 * tres sub-findings más el agregado `t1.assessment`.
 *
 * Separada de `t1Detector.run()` (que la llama con las opciones por
 * defecto) para que los tests puedan inyectar `resolveHostname` contra un
 * servidor local — mismo motivo por el que `runScan()` (packages/scanner)
 * expone esa opción en vez de resolver DNS real siempre.
 */
export async function runT1Detection(
  evaluationId: string,
  finalUrl: string,
  options: T1DetectionOptions = {},
): Promise<DetectorResult> {
  if (!checkUrl(finalUrl).allowed) {
    return buildErrorResult(evaluationId);
  }

  const browser = await launchSecureBrowser(options.launchArgs);
  try {
    const browserContext = await createSecureContext(browser);
    installSsrfGuard(browserContext, { limits: options.guardLimits, resolveHostname: options.resolveHostname });
    const page = await browserContext.newPage();

    let response;
    try {
      response = await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    } catch {
      return buildErrorResult(evaluationId);
    }
    if (!response || !response.ok()) {
      return buildErrorResult(evaluationId);
    }

    const channelResult = await detectAndOpenChannel(page);

    if (channelResult.status === "not_detected") {
      const t1Channel: T1ChannelFinding = {
        observationStatus: "not_detected",
        detail: { human_intermediary_detected: channelResult.humanIntermediaryDetected },
      };
      const channelFinding = finding(
        evaluationId,
        "t1.channel",
        "not_detected",
        "medium",
        channelResult.humanIntermediaryDetected ? "t1.channel.human_intermediary" : "t1.channel.not_detected",
        { ...t1Channel.detail },
      );
      const assessment = deriveT1Assessment(t1Channel);
      return { findings: [channelFinding, buildAssessmentFinding(evaluationId, channelFinding, assessment)] };
    }

    if (channelResult.status === "not_assessable") {
      const t1Channel: T1ChannelFinding = {
        observationStatus: "not_assessable",
        detail: { human_intermediary_detected: false },
      };
      const channelFinding = finding(
        evaluationId,
        "t1.channel",
        "not_assessable",
        "low",
        "t1.channel.not_assessable",
        { ...t1Channel.detail },
      );
      const assessment = deriveT1Assessment(t1Channel);
      return { findings: [channelFinding, buildAssessmentFinding(evaluationId, channelFinding, assessment)] };
    }

    // channelResult.status === "detected"
    const t1Channel: T1ChannelFinding = { observationStatus: "detected", detail: { human_intermediary_detected: false } };
    const channelFinding = finding(
      evaluationId,
      "t1.channel",
      "detected",
      channelResult.confidence,
      "t1.channel.detected",
      { ...t1Channel.detail, vendor: channelResult.vendor?.vendor ?? null },
    );

    const aiEvidence = classifyAiEvidence(channelResult.vendor, channelResult.panelText);
    const t1AiEvidence: T1AiEvidenceFinding = {
      observationStatus: aiEvidence.status,
      detail: { evidence_of_human: aiEvidence.evidenceOfHuman },
    };
    const aiEvidenceFinding = finding(
      evaluationId,
      "t1.ai_evidence",
      aiEvidence.status,
      aiEvidence.confidence,
      aiEvidence.status === "detected" ? "t1.ai_evidence.detected" : "t1.ai_evidence.not_detected",
      { ...t1AiEvidence.detail },
    );

    if (aiEvidence.status === "not_detected") {
      const assessment = deriveT1Assessment(t1Channel, t1AiEvidence);
      return {
        findings: [channelFinding, aiEvidenceFinding, buildAssessmentFinding(evaluationId, channelFinding, assessment)],
      };
    }

    const disclosure = classifyDisclosure(channelResult.panelText);
    const disclosureDetail: Record<string, unknown> = {
      disclosure_timing: disclosure.status === "detected" ? "on_open" : "n/a",
    };
    // §21 (resuelta #2): action_recommended nunca implica en el copy
    // "falta un aviso obligatorio" — se marca la nota de excepción de
    // obviedad y se capturan sus señales; esto documenta la evidencia para
    // revisión humana, no cambia el assessmentStatus.
    if (disclosure.status === "not_detected") {
      disclosureDetail.context_exceptions_note = true;
      disclosureDetail.obviousness_signals = buildObviousnessSignals(channelResult.panelText, channelResult.vendor);
    }
    const t1Disclosure: T1DisclosureFinding = { observationStatus: disclosure.status, detail: disclosureDetail };
    const disclosureFinding = finding(
      evaluationId,
      "t1.disclosure",
      disclosure.status,
      disclosure.confidence,
      disclosure.status === "detected" ? "t1.disclosure.detected" : "t1.disclosure.not_detected",
      disclosureDetail,
    );

    const assessment = deriveT1Assessment(t1Channel, t1AiEvidence, t1Disclosure);
    return {
      findings: [
        channelFinding,
        aiEvidenceFinding,
        disclosureFinding,
        buildAssessmentFinding(evaluationId, channelFinding, assessment),
      ],
    };
  } finally {
    await browser.close();
  }
}

export const t1Detector: Detector<"t1"> = {
  id: "t1",
  version: "0.1.0",
  run: (context: DetectorContext) => runT1Detection(context.evaluationId, context.finalUrl),
};
