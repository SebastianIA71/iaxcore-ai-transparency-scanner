"use client";

// Subpath, no el barrel — ver el mismo comentario en app/page.tsx.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

const T = COPY.es.verify;

interface VerifyResult {
  verified?: boolean;
  reason?: "not_completed" | "no_signature" | "unknown_key";
  status?: string;
  evaluationId?: string;
  requestedUrl?: string;
  completedAt?: string;
  keyId?: string;
  canonicalHash?: string;
}

interface WellKnownKeys {
  keys: { keyId: string; publicKeyBase64: string; algorithm: string }[];
}

function resultMessage(result: VerifyResult): string {
  if (result.reason === "not_completed") return T.resultNotCompleted;
  if (result.reason === "no_signature") return T.resultNoSignature;
  if (result.reason === "unknown_key") return T.resultUnknownKey;
  return result.verified ? T.resultValid : T.resultInvalid;
}

// useSearchParams() (para precargar ?id= al llegar desde el enlace de
// /scan/[id]) exige un límite <Suspense> en Next.js App Router — de ahí
// que la lógica viva en un componente aparte del default export.
function VerifyForm() {
  const searchParams = useSearchParams();
  const [evaluationId, setEvaluationId] = useState(searchParams.get("id") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [publicKey, setPublicKey] = useState<WellKnownKeys["keys"][number] | null>(null);

  useEffect(() => {
    fetch("/.well-known/iaxcore-keys.json")
      .then((res) => res.json())
      .then((json: WellKnownKeys) => setPublicKey(json.keys[0] ?? null))
      .catch(() => {});
  }, []);

  async function verify(id: string) {
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(id)}`);
      if (response.status === 404) {
        setError(T.notFound);
        return;
      }
      if (!response.ok) {
        setError(T.errorGeneric);
        return;
      }
      setResult((await response.json()) as VerifyResult);
    } catch {
      setError(T.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) void verify(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verify(evaluationId.trim());
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← IAXCORE
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.heading}</h1>
      <p className="mt-2 text-neutral-500">{T.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="evaluation-id">
          {T.idLabel}
        </label>
        <input
          id="evaluation-id"
          name="evaluationId"
          type="text"
          required
          value={evaluationId}
          onChange={(event) => setEvaluationId(event.target.value)}
          placeholder={T.idPlaceholder}
          className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? T.submitting : T.submit}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-6 rounded-md bg-neutral-50 p-4">
          <p className={`text-sm font-semibold ${result.verified ? "text-green-700" : "text-red-600"}`}>
            {resultMessage(result)}
          </p>
          {result.requestedUrl && (
            <dl className="mt-3 space-y-1 text-sm text-neutral-600">
              <div>
                <dt className="inline font-medium">{T.fieldRequestedUrl}: </dt>
                <dd className="inline break-all">{result.requestedUrl}</dd>
              </div>
              {result.completedAt && (
                <div>
                  <dt className="inline font-medium">{T.fieldCompletedAt}: </dt>
                  <dd className="inline">{result.completedAt}</dd>
                </div>
              )}
              {result.keyId && (
                <div>
                  <dt className="inline font-medium">{T.fieldKeyId}: </dt>
                  <dd className="inline font-mono">{result.keyId}</dd>
                </div>
              )}
              {result.canonicalHash && (
                <div>
                  <dt className="inline font-medium">{T.fieldHash}: </dt>
                  <dd className="inline break-all font-mono">{result.canonicalHash}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      {publicKey && (
        <section className="mt-8 border-t border-neutral-200 pt-4">
          <h2 className="text-sm font-semibold text-neutral-700">{T.publicKeyHeading}</h2>
          <p className="mt-1 break-all font-mono text-xs text-neutral-500">
            {publicKey.keyId}: {publicKey.publicKeyBase64}
          </p>
          <p className="mt-1 text-xs text-neutral-400">{T.publicKeyNote}</p>
        </section>
      )}
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
