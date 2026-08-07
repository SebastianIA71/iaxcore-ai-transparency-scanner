// Servidor, sin estado — no hace falta "use client" aquí. Las cadenas de
// identificación (User-Agent, token de robots.txt) se documentan aquí como
// copy porque importar @iaxcore/scanner (que arrastra Playwright) solo para
// mostrar dos constantes sería una dependencia desproporcionada — deben
// mantenerse iguales a CRAWLER_HTTP_USER_AGENT (packages/scanner/src/
// browser.ts) y CRAWLER_USER_AGENT (packages/scanner/src/robots.ts) a mano.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";

const T = COPY.es;

export const metadata = { title: `${T.bot.heading} · IAXCORE` };

export default function BotPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← {T.scan.backToScan}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.bot.heading}</h1>
      <p className="mt-4 text-neutral-700">{T.bot.intro}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.bot.userAgentHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">{T.bot.userAgentNote}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.bot.robotsHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">{T.bot.robotsNote}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.bot.behaviorHeading}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">
          {T.bot.behavior.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.bot.optOutHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">{T.bot.optOutNote}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">{T.bot.contactHeading}</h2>
        <p className="mt-2 text-sm text-neutral-600">
          <a href={`mailto:${T.contact.email}`} className="text-neutral-800 hover:underline">
            {T.contact.email}
          </a>
        </p>
      </section>
    </main>
  );
}
