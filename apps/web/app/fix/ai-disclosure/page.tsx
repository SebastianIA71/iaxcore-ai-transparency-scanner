"use client";

// Subpaths, no el barrel — ver el mismo comentario en app/page.tsx. "./fix"
// solo importa "./copy.js" internamente (packages/core/src/fix.ts), así que
// tampoco arrastra node:crypto.
import { COPY, type CopyLocale } from "@iaxcore/core/copy";
import { generateAiDisclosureFix } from "@iaxcore/core/fix";
import Link from "next/link";
import { useState } from "react";

const T = COPY.es;

export default function AiDisclosureFixPage() {
  const [locale, setLocale] = useState<CopyLocale>("es");
  const [copied, setCopied] = useState(false);
  const fix = generateAiDisclosureFix(locale);

  async function handleCopy() {
    await navigator.clipboard.writeText(fix.htmlSnippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← {T.scan.backToScan}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.fix.pageHeading}</h1>
      <p className="mt-4 text-neutral-700">{T.fix.pageIntro}</p>

      <fieldset className="mt-6 flex items-center gap-3">
        <legend className="mb-2 text-sm font-medium text-neutral-700">{T.fix.localeLabel}</legend>
        <button
          type="button"
          onClick={() => setLocale("es")}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            locale === "es" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"
          }`}
        >
          {T.fix.localeEs}
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            locale === "en" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"
          }`}
        >
          {T.fix.localeEn}
        </button>
      </fieldset>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700">{T.fix.noticeHeading}</h2>
        <p className="mt-2 rounded-md bg-neutral-50 p-3 text-sm text-neutral-800">{fix.noticeText}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700">{T.fix.snippetHeading}</h2>
        <pre className="mt-2 overflow-x-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100">
          <code>{fix.htmlSnippet}</code>
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
        >
          {copied ? T.fix.copied : T.fix.copyButton}
        </button>
        <p className="mt-2 text-xs text-neutral-500">{T.fix.contrastNote}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700">{T.fix.placementHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">{fix.placementInstructions}</p>
      </section>
    </main>
  );
}
