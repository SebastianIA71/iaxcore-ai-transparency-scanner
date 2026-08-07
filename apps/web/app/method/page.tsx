// Servidor, sin estado — no hace falta "use client" aquí.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";

const T = COPY.es;

export const metadata = { title: `${T.method.heading} · IAXCORE` };

export default function MethodPage() {
  const observationKeys = Object.keys(T.status.observation) as Array<keyof typeof T.status.observation>;
  const assessmentKeys = Object.keys(T.status.assessment) as Array<keyof typeof T.status.assessment>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← {T.scan.backToScan}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.method.heading}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {T.method.versionLabel}: {T.method.version}
      </p>
      <p className="mt-4 text-neutral-700">{T.method.intro}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.method.statesHeading}</h2>
        <p className="mt-1 text-sm text-neutral-600">{T.method.statesIntro}</p>
        <dl className="mt-3 space-y-3">
          {observationKeys.map((key) => (
            <div key={key}>
              <dt className="text-sm font-medium text-neutral-800">{T.status.observation[key]}</dt>
              <dd className="text-sm text-neutral-600">{T.method.observationExplanations[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.method.assessmentHeading}</h2>
        <p className="mt-1 text-sm text-neutral-600">{T.method.assessmentIntro}</p>
        <dl className="mt-3 space-y-3">
          {assessmentKeys.map((key) => (
            <div key={key}>
              <dt className="text-sm font-medium text-neutral-800">{T.status.assessment[key]}</dt>
              <dd className="text-sm text-neutral-600">{T.scan.assessmentExplanations[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.method.limitsHeading}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
          {T.method.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.method.consentBannerHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">{T.method.consentBanner}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.method.referencesHeading}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
          {T.method.references.map((reference) => (
            <li key={reference}>{reference}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
