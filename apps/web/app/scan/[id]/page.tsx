"use client";

// Subpath, no el barrel — ver el mismo comentario en app/page.tsx.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const T = COPY.es;

type EvaluationStatus = "queued" | "running" | "completed" | "failed";

interface Finding {
  detectorId: string;
  observationStatus: keyof typeof T.status.observation;
  assessmentStatus?: keyof typeof T.status.assessment;
  confidenceBand: string;
  summaryKey: string;
  detail: Record<string, unknown>;
}

interface EvaluationResponse {
  id: string;
  status: EvaluationStatus;
  requestedUrl: string;
  finalUrl?: string;
  methodVersion: string;
  pagesRequested: number;
  pagesAnalyzed: number;
  findings: Finding[];
}

const POLL_INTERVAL_MS = 2000;
// §6: los tres sub-findings de T1, en el orden del ejemplo de la spec
// ("t1.channel / t1.ai_evidence / t1.disclosure / T1 assessment").
const T1_SUB_FINDINGS = ["t1.channel", "t1.ai_evidence", "t1.disclosure"] as const;

function findingLine(finding: Finding): string {
  const status = T.status.observation[finding.observationStatus] ?? finding.observationStatus;
  const timing = finding.detail.disclosure_timing;
  const suffix = typeof timing === "string" ? ` — disclosure_timing: ${timing}` : ` (confianza: ${finding.confidenceBand})`;
  return `${finding.detectorId}: ${status}${suffix}`;
}

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<EvaluationResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const response = await fetch(`/api/scans/${id}`).catch(() => null);
      if (cancelled) return;
      if (!response || !response.ok) {
        setNotFound(true);
        return;
      }
      const json = (await response.json()) as EvaluationResponse;
      if (cancelled) return;
      setData(json);
      if (json.status === "queued" || json.status === "running") {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← {T.scan.backToScan}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.scan.heading}</h1>

      {notFound && <p className="mt-4 text-red-600">No se encontró esa evaluación.</p>}

      {!notFound && !data && <p className="mt-4 text-neutral-500">Cargando…</p>}

      {data && (
        <div className="mt-4">
          <p className="break-all text-neutral-600">{data.requestedUrl}</p>

          {data.status === "queued" && <p className="mt-4">{T.scan.statusQueued}…</p>}
          {data.status === "running" && <p className="mt-4">{T.scan.statusRunning}…</p>}
          {data.status === "failed" && <p className="mt-4 text-red-600">{T.scan.statusFailed}</p>}

          {data.status === "completed" && (
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
                    return (
                      <div className="mt-1 font-semibold">
                        T1: {T.status.assessment[assessment.assessmentStatus]}
                      </div>
                    );
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
          )}
        </div>
      )}
    </main>
  );
}
