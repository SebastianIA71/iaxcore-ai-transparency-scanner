// Servidor, sin estado — no hace falta "use client" aquí.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";

const T = COPY.es;

export const metadata = { title: `${T.privacy.heading} · IAXCORE` };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← {T.scan.backToScan}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.privacy.heading}</h1>
      <p className="mt-4 text-neutral-700">{T.privacy.intro}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.privacy.whatWeCollectHeading}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
          {T.privacy.whatWeCollect.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-md bg-neutral-50 p-3 text-sm text-neutral-600">{T.privacy.todayNote}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.privacy.retentionHeading}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
          <li>{T.privacy.retentionReport}</li>
          <li>{T.privacy.retentionEvidence}</li>
          <li>{T.privacy.retentionShareLink}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.privacy.deletionHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">{T.privacy.deletion}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.privacy.contactHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">
          <a href={`mailto:${T.contact.email}`} className="text-neutral-800 hover:underline">
            {T.contact.email}
          </a>
        </p>
      </section>
    </main>
  );
}
