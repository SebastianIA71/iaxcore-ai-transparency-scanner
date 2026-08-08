"use client";

// Subpath, no el barrel — ver el comentario en app/page.tsx. Compartido
// entre /scan/[id] (visto por quien lanzó el escaneo) y /r/[token] (visto
// por quien recibe un enlace compartido, §14) — el mismo contenido, dos
// caminos de acceso distintos (ID directo vs. token revocable/caducable).
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const T = COPY.es;

export interface Finding {
  detectorId: string;
  observationStatus: keyof typeof T.status.observation;
  assessmentStatus?: keyof typeof T.status.assessment;
  confidenceBand: string;
  summaryKey: string;
  detail: Record<string, unknown>;
}

interface ManifestPage {
  url: string;
  status: "completed" | "excluded";
  exclusionReason?: string;
  httpStatus?: number;
}

interface BlockedRequest {
  url: string;
  reason: string;
}

interface Manifest {
  pages?: ManifestPage[];
  blocked_requests?: BlockedRequest[];
  consent_interaction?: keyof typeof T.scan.consentInteraction;
}

interface T2Signal {
  location: keyof typeof T.scan.t2SignalLocations;
  matchedText: string;
}

interface RescanComparison {
  before: keyof typeof T.status.assessment;
  after: keyof typeof T.status.assessment;
  changed: boolean;
  resolvedActionRecommended: boolean;
}

export interface ReportData {
  id: string;
  requestedUrl: string;
  finalUrl?: string;
  methodVersion: string;
  pagesRequested: number;
  pagesAnalyzed: number;
  manifest?: Manifest;
  findings: Finding[];
  rescanOfEvaluationId?: string | null;
  latestRescanId?: string | null;
  rescanComparison?: RescanComparison | null;
}

// §6: los tres sub-findings de T1, en el orden del ejemplo de la spec
// ("t1.channel / t1.ai_evidence / t1.disclosure / T1 assessment").
const T1_SUB_FINDINGS = ["t1.channel", "t1.ai_evidence", "t1.disclosure"] as const;

function findingLine(finding: Finding): string {
  const status = T.status.observation[finding.observationStatus] ?? finding.observationStatus;
  const timing = finding.detail.disclosure_timing;
  const suffix = typeof timing === "string" ? ` — disclosure_timing: ${timing}` : ` (confianza: ${finding.confidenceBand})`;
  return `${finding.detectorId}: ${status}${suffix}`;
}

function exclusionReasonText(reason: string | undefined): string {
  if (!reason) return T.scan.exclusionReasonFallback;
  return (T.scan.exclusionReasons as Record<string, string>)[reason] ?? T.scan.exclusionReasonFallback;
}

// §7/§10-Fase 7: botón de intención "Solicitar expediente" — captura un
// lead cualificado, no cobra nada aquí mismo (§10-Fase 7: "cobro manual o
// enlace de pago externo — no se construye pasarela de pago").
function DossierUnlock({ evaluationId }: { evaluationId: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!consent) {
      setError(T.dossier.errorConsentRequired);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, evaluationId, contactConsent: consent }),
      });
      if (response.status === 201) {
        setSuccess(true);
        return;
      }
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (json.error === "invalid_email") setError(T.dossier.errorInvalidEmail);
      else if (json.error === "consent_required") setError(T.dossier.errorConsentRequired);
      else setError(T.dossier.errorGeneric);
    } catch {
      setError(T.dossier.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-md border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold text-neutral-700">{T.dossier.heading}</h2>
      {success ? (
        <p className="mt-2 text-sm text-green-700">{T.dossier.success}</p>
      ) : (
        <>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{T.dossier.price}</p>
          <p className="mt-2 text-sm text-neutral-600">{T.dossier.description}</p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="dossier-email">
              {T.dossier.emailLabel}
            </label>
            <input
              id="dossier-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={T.dossier.emailPlaceholder}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            />
            <label className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              {T.dossier.consentLabel}
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 self-start rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {submitting ? T.dossier.submitting : T.dossier.submit}
            </button>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  );
}

// §10-Fase 7: "feedback estructurado" — un rating de 1 a 5 más un
// comentario libre opcional, independiente del informe (§15, igual que
// Lead/DossierUnlock arriba).
function FeedbackWidget({ evaluationId }: { evaluationId: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!rating) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evaluationId, rating, comment: comment || undefined }),
      });
      if (response.status === 201) {
        setSuccess(true);
        return;
      }
      setError(T.feedback.errorGeneric);
    } catch {
      setError(T.feedback.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="mt-8 rounded-md border border-neutral-200 p-4">
        <p className="text-sm text-green-700">{T.feedback.success}</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-md border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold text-neutral-700">{T.feedback.heading}</h2>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <fieldset className="flex items-center gap-2">
          <legend className="mb-1 text-sm font-medium text-neutral-700">{T.feedback.ratingLabel}</legend>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-pressed={rating === value}
              className={`h-9 w-9 rounded-md border text-sm ${
                rating === value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"
              }`}
            >
              {value}
            </button>
          ))}
        </fieldset>
        <label className="text-sm font-medium text-neutral-700" htmlFor="feedback-comment">
          {T.feedback.commentLabel}
        </label>
        <textarea
          id="feedback-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={T.feedback.commentPlaceholder}
          rows={3}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
        <button
          type="submit"
          disabled={submitting || !rating}
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? T.feedback.submitting : T.feedback.submit}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

// §10-Fase 4: "Rescan" — repite el escaneo de la misma URL (típicamente
// tras aplicar el aviso generado en /fix/ai-disclosure) y enlaza la nueva
// evaluación a esta vía rescanOfEvaluationId. Vive en ReportView (no en
// scan/[id]/page.tsx como ShareButton) para que también esté disponible al
// ver un informe compartido en /r/[token] — a diferencia de compartir, "¿ya
// se corrigió?" tiene sentido para cualquiera que vea el informe, no solo
// para quien lo lanzó.
function RescanButton({ evaluationId }: { evaluationId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRescan() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/scans/${evaluationId}/rescan`, { method: "POST" });
      if (response.status === 201) {
        const { id } = (await response.json()) as { id: string };
        window.location.href = `/scan/${id}`;
        return;
      }
      if (response.status === 429) {
        setError(T.scan.rescanErrorRateLimited);
      } else {
        setError(T.scan.rescanErrorGeneric);
      }
    } catch {
      setError(T.scan.rescanErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleRescan}
        disabled={submitting}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 disabled:opacity-50"
      >
        {submitting ? T.scan.rescanSubmitting : T.scan.rescanButton}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReportView({ data }: { data: ReportData }) {
  const pages = data.manifest?.pages ?? [];
  const excludedPages = pages.filter((p) => p.status === "excluded");
  const blockedRequests = data.manifest?.blocked_requests ?? [];
  const consentInteraction = data.manifest?.consent_interaction;

  return (
    <>
      <pre className="mt-6 whitespace-pre-wrap rounded-md bg-neutral-50 p-4 font-mono text-sm text-neutral-800">
        {data.findings.length === 0 ? (
          T.scan.noFindings
        ) : (
          <>
            {T1_SUB_FINDINGS.map((detectorId) => {
              const finding = data.findings.find((f) => f.detectorId === detectorId);
              return finding ? <div key={detectorId}>{findingLine(finding)}</div> : null;
            })}
            {(() => {
              const assessment = data.findings.find((f) => f.detectorId === "t1.assessment");
              if (!assessment?.assessmentStatus) return null;
              return <div className="mt-1 font-semibold">T1: {T.status.assessment[assessment.assessmentStatus]}</div>;
            })()}
            <div className="mt-3">
              {T.scan.pagesAnalyzed}: {data.pagesAnalyzed}/{data.pagesRequested}
            </div>
            <div>
              {T.scan.method}: {data.methodVersion}
            </div>
          </>
        )}
      </pre>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link href={`/verify?id=${data.id}`} className="inline-block text-sm text-neutral-500 hover:underline">
          {T.verify.heading} →
        </Link>
        <a
          href={`/api/scans/${data.id}/pdf`}
          className="inline-block text-sm text-neutral-500 hover:underline"
        >
          {T.scan.pdfDownload} ↓
        </a>
        {data.rescanOfEvaluationId && (
          <Link href={`/scan/${data.rescanOfEvaluationId}`} className="inline-block text-sm text-neutral-500 hover:underline">
            {T.scan.viewOriginalScan} →
          </Link>
        )}
        {data.latestRescanId && (
          <Link href={`/scan/${data.latestRescanId}`} className="inline-block text-sm text-neutral-500 hover:underline">
            {T.scan.viewLatestRescan} →
          </Link>
        )}
      </div>

      {data.rescanOfEvaluationId && (
        <p className="mt-2 text-sm text-neutral-500">{T.scan.rescanOfNote}</p>
      )}

      {/* §10-Fase 4: comparación T1 antes/después — solo aparece cuando esta
          evaluación es un rescan y ambas evaluaciones ya tienen un veredicto
          T1 que comparar (ver compareT1Assessments en packages/core). */}
      {data.rescanComparison && (
        <section className="mt-4 rounded-md border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-700">{T.scan.rescanComparisonHeading}</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {T.status.assessment[data.rescanComparison.before]} → {T.status.assessment[data.rescanComparison.after]}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {data.rescanComparison.changed ? T.scan.rescanComparisonChanged : T.scan.rescanComparisonUnchanged}
          </p>
          {data.rescanComparison.resolvedActionRecommended && (
            <p className="mt-1 text-sm text-green-700">{T.scan.rescanComparisonResolved}</p>
          )}
        </section>
      )}

      {/* Explicación en prosa del veredicto — el bloque de arriba usa el
          vocabulario obligatorio de §4, compacto pero poco autoexplicativo
          por sí solo. */}
      {(() => {
        const assessment = data.findings.find((f) => f.detectorId === "t1.assessment");
        if (!assessment?.assessmentStatus) return null;
        return <p className="mt-3 text-sm text-neutral-600">{T.scan.assessmentExplanations[assessment.assessmentStatus]}</p>;
      })()}

      {/* Cobertura: por qué el número de páginas analizadas puede ser menor
          que el solicitado, y qué se bloqueó por el camino — sin esto,
          "1/5" no se entiende. */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700">{T.scan.coverageHeading}</h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-600">
          {pages.map((page) => (
            <li key={page.url} className="break-all">
              <span className={page.status === "completed" ? "text-green-700" : "text-amber-700"}>
                {page.status === "completed" ? T.scan.pageStatusCompleted : T.scan.pageStatusExcluded}
              </span>
              {" — "}
              {page.url}
              {page.status === "excluded" && (
                <span className="text-neutral-500"> ({exclusionReasonText(page.exclusionReason)})</span>
              )}
            </li>
          ))}
          {excludedPages.length === 0 && pages.length > 0 && pages.length < data.pagesRequested && (
            <li className="text-neutral-500">
              {T.scan.pagesAnalyzed}: {pages.length}/{data.pagesRequested} — no se encontraron más páginas del mismo
              dominio para analizar.
            </li>
          )}
        </ul>

        {blockedRequests.length > 0 && (
          <p className="mt-3 text-sm text-neutral-500">
            {blockedRequests.length} {T.scan.blockedRequestsNote}.
          </p>
        )}

        {consentInteraction && <p className="mt-3 text-sm text-neutral-500">{T.scan.consentInteraction[consentInteraction]}</p>}
      </section>

      {/* T2 (§5.2) — informativo, nunca un veredicto: solo cuenta y
          localiza etiquetas visibles de contenido con IA, si las hay. */}
      {(() => {
        const t2 = data.findings.find((f) => f.detectorId === "t2.visible_labelling");
        if (!t2) return null;
        const signals = (t2.detail.signals as T2Signal[] | undefined) ?? [];
        return (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-neutral-700">{T.scan.t2Heading}</h2>
            {t2.observationStatus === "error" && <p className="mt-2 text-sm text-neutral-500">{T.scan.t2Error}</p>}
            {t2.observationStatus === "not_detected" && <p className="mt-2 text-sm text-neutral-500">{T.scan.t2NotDetected}</p>}
            {signals.length > 0 && (
              <>
                <p className="mt-2 text-sm text-neutral-600">
                  {signals.length} {T.scan.t2Detected}:
                </p>
                <ul className="mt-1 space-y-1 text-sm text-neutral-600">
                  {signals.map((signal, i) => (
                    <li key={i}>
                      {T.scan.t2SignalLocations[signal.location] ?? signal.location}: "{signal.matchedText}"
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })()}

      <RescanButton evaluationId={data.id} />
      <DossierUnlock evaluationId={data.id} />
      <FeedbackWidget evaluationId={data.id} />
    </>
  );
}
