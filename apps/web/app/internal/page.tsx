// §10-Fase 7: "panel interno de errores técnicos" + telemetría/feedback en
// un único panel de operador. No hay login en este piloto (§21 lo prohíbe
// explícitamente) — en su lugar, un token compartido por variable de
// entorno (INTERNAL_DASHBOARD_TOKEN) en la query string. Sin token o con
// uno incorrecto, notFound() devuelve un 404 real e indistinguible de que
// la ruta no existiera, en vez de revelar que hay algo protegido aquí.
import { countTelemetryEventsByKind, getFeedbackSummary } from "@iaxcore/db";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadMetrics() {
  const db = getDb();

  const [statusCounts, assessmentCounts, evaluationTotal, completedTotal, leadTotal, shareLinkTotal, telemetry, feedback, recentFailures] =
    await Promise.all([
      db.evaluation.groupBy({ by: ["status"], _count: { _all: true } }),
      db.finding.groupBy({ by: ["assessmentStatus"], where: { detectorId: "t1.assessment" }, _count: { _all: true } }),
      db.evaluation.count(),
      db.evaluation.count({ where: { status: "completed" } }),
      db.lead.count(),
      db.shareLink.count(),
      countTelemetryEventsByKind(db),
      getFeedbackSummary(db),
      db.evaluation.findMany({
        where: { status: "failed" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          requestedUrl: true,
          updatedAt: true,
          scanJob: { select: { lastError: true, attempts: true } },
        },
      }),
    ]);

  return {
    statusCounts,
    assessmentCounts,
    evaluationTotal,
    completedTotal,
    leadTotal,
    shareLinkTotal,
    telemetry,
    feedback,
    recentFailures,
  };
}

export default async function InternalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.INTERNAL_DASHBOARD_TOKEN;
  if (!expected || token !== expected) {
    notFound();
  }

  const metrics = await loadMetrics();
  const priceClickRate = metrics.completedTotal > 0 ? (metrics.leadTotal / metrics.completedTotal) * 100 : null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Panel interno</h1>
      <p className="mt-1 text-sm text-neutral-500">Solo para uso del operador — no enlazado desde el sitio público.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Evaluaciones por estado</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {metrics.statusCounts.map((row) => (
              <tr key={row.status} className="border-b border-neutral-100">
                <td className="py-1 pr-4 text-neutral-600">{row.status}</td>
                <td className="py-1 font-medium">{row._count._all}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1 pr-4 text-neutral-600">total</td>
              <td className="py-1 font-medium">{metrics.evaluationTotal}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Veredicto de T1 (§13: tasa de insufficient_evidence)</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {metrics.assessmentCounts.map((row) => (
              <tr key={row.assessmentStatus ?? "null"} className="border-b border-neutral-100">
                <td className="py-1 pr-4 text-neutral-600">{row.assessmentStatus ?? "(sin t1.assessment)"}</td>
                <td className="py-1 font-medium">{row._count._all}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Disposición a pagar (§13, §17)</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-1 pr-4 text-neutral-600">leads capturados</td>
              <td className="py-1 font-medium">{metrics.leadTotal}</td>
            </tr>
            <tr className="border-b border-neutral-100">
              <td className="py-1 pr-4 text-neutral-600">evaluaciones completadas</td>
              <td className="py-1 font-medium">{metrics.completedTotal}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-neutral-600">tasa de clic en precio</td>
              <td className="py-1 font-medium">{priceClickRate === null ? "—" : `${priceClickRate.toFixed(1)}%`}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Telemetría</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-1 pr-4 text-neutral-600">enlaces compartidos creados</td>
              <td className="py-1 font-medium">{metrics.shareLinkTotal}</td>
            </tr>
            {metrics.telemetry.map((row) => (
              <tr key={row.kind} className="border-b border-neutral-100">
                <td className="py-1 pr-4 text-neutral-600">{row.kind}</td>
                <td className="py-1 font-medium">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Feedback estructurado</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-1 pr-4 text-neutral-600">respuestas</td>
              <td className="py-1 font-medium">{metrics.feedback.count}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-neutral-600">valoración media</td>
              <td className="py-1 font-medium">
                {metrics.feedback.averageRating === null ? "—" : metrics.feedback.averageRating.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-800">Errores técnicos recientes (últimos 20 fallos)</h2>
        {metrics.recentFailures.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Sin fallos registrados.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {metrics.recentFailures.map((failure) => (
              <li key={failure.id} className="rounded-md border border-neutral-200 p-3">
                <div className="break-all font-mono text-xs text-neutral-500">{failure.id}</div>
                <div className="break-all text-neutral-700">{failure.requestedUrl}</div>
                <div className="mt-1 text-neutral-500">{failure.updatedAt.toISOString()}</div>
                {failure.scanJob?.lastError && (
                  <div className="mt-1 break-all text-red-700">
                    {failure.scanJob.lastError} (intentos: {failure.scanJob.attempts})
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
