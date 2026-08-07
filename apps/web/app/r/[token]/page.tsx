"use client";

// §14: "/r/{shareToken} — informe privado compartible y verificable".
// A diferencia de /scan/[id], aquí no hay polling: un share link solo se
// crea a partir de una evaluación ya completada (ver POST
// /api/scans/[id]/share), así que una única carga basta.
import { COPY } from "@iaxcore/core/copy";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportView, type ReportData } from "../../_components/ReportView";

const T = COPY.es;

export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<ReportData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/r/${token}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json: ReportData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← {T.scan.backToScan}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{T.scan.heading}</h1>

      {notFound && <p className="mt-4 text-red-600">Este enlace no existe, caducó o fue revocado.</p>}

      {!notFound && !data && <p className="mt-4 text-neutral-500">Cargando…</p>}

      {data && (
        <div className="mt-4">
          <p className="break-all text-neutral-600">{data.requestedUrl}</p>
          <ReportView data={data} />
        </div>
      )}
    </main>
  );
}
