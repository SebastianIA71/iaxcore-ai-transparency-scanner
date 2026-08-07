"use client";

// Subpath, no el barrel — ver el mismo comentario en app/page.tsx.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportView, type ReportData } from "../../_components/ReportView";

const T = COPY.es;

type EvaluationStatus = "queued" | "running" | "completed" | "failed";

interface EvaluationResponse extends ReportData {
  status: EvaluationStatus;
}

const POLL_INTERVAL_MS = 2000;

// §14: botón "Compartir informe" — crea un ShareLink revocable/caducable
// (30 días, §9) apuntando al último ReportArtifact firmado; el token en
// claro solo existe en la respuesta de este POST, nunca se vuelve a poder
// recuperar (la base solo guarda su hash).
function ShareButton({ evaluationId }: { evaluationId: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/scans/${evaluationId}/share`, { method: "POST" });
      if (!response.ok) {
        setError(T.scan.shareError);
        return;
      }
      const json = (await response.json()) as { path: string };
      setShareUrl(`${window.location.origin}${json.path}`);
    } catch {
      setError(T.scan.shareError);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6">
      {!shareUrl ? (
        <button
          type="button"
          onClick={handleShare}
          disabled={loading}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 disabled:opacity-50"
        >
          {loading ? T.scan.shareLoading : T.scan.shareButton}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
          >
            {copied ? T.scan.shareCopied : T.scan.shareCopy}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
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
            <>
              <ReportView data={data} />
              <ShareButton evaluationId={data.id} />
            </>
          )}
        </div>
      )}
    </main>
  );
}
