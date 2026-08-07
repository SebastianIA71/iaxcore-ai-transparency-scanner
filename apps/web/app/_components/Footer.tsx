// Servidor, sin estado — reutiliza los títulos ya definidos en COPY para
// cada página en vez de duplicar etiquetas de navegación aparte.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";

const T = COPY.es;

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/method", label: T.method.heading },
  { href: "/fix/ai-disclosure", label: T.fix.pageHeading },
  { href: "/verify", label: T.verify.heading },
  { href: "/privacy", label: T.privacy.heading },
  { href: "/bot", label: T.bot.heading },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-2xl px-8 pb-8 pt-4">
      <nav className="flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
