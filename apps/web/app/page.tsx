"use client";

// Subpath, no el barrel "@iaxcore/core": este es un componente cliente, y
// el índice completo arrastra signing.ts/privacy.ts (node:crypto), que
// webpack no puede empaquetar para el navegador.
import { COPY } from "@iaxcore/core/copy";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const T = COPY.es.landing;

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (response.status === 201) {
        const { id } = (await response.json()) as { id: string };
        router.push(`/scan/${id}`);
        return;
      }
      if (response.status === 400) {
        setError(T.errorInvalidUrl);
      } else if (response.status === 429) {
        setError(T.errorRateLimited);
      } else {
        setError(T.errorGeneric);
      }
    } catch {
      setError(T.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-semibold">{T.title}</h1>
        <p className="mt-2 text-neutral-500">{T.subtitle}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="url">
          {T.urlLabel}
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={T.urlPlaceholder}
          className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? T.submitting : T.submit}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
