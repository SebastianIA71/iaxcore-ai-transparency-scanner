import { FORBIDDEN_COPY_WORDS } from "./vocabulary.js";

// Diccionario ES/EN — Fase 0 entregable las cadenas que la spec fija
// textualmente (§4, §5.1: t1.actionRecommended/humanChatDetected). Fase 4
// (fix) y Fase 7 (status/landing/scan) añaden el resto del copy visible del
// producto — "se completa en Fase 7 sin reabrir este contrato" (comentario
// original) significaba no tocar las cadenas fijadas por la spec, no que el
// resto del diccionario se quede vacío; todo copy visible pasa por aquí
// justamente para que el barrido de palabras prohibidas de más abajo lo cubra.
export const COPY = {
  es: {
    t1: {
      actionRecommended: "se recomienda añadir un aviso explícito",
      humanChatDetected:
        "Se detectó un canal de atención que se declara atendido por personas; las señales de transparencia de IA no aplican dentro del alcance observado.",
    },
    // §10-Fase 4: texto del generador de aviso — a diferencia de lo de
    // arriba, la spec no fija esta redacción literalmente.
    fix: {
      aiDisclosureNotice:
        "Estás hablando con un asistente virtual de inteligencia artificial. Este sistema automatizado está aquí para ayudarte.",
      placementInstructions:
        "Coloca este aviso como primer mensaje visible al abrir el chat, antes de que la persona pueda escribir.",
    },
    // §4: "lenguaje obligatorio: 'detectado', 'no detectado dentro del
    // alcance', 'no verificable', 'evidencia insuficiente' y 'acción
    // recomendada'." Los tres que la spec no fija (aligned/not_applicable/
    // experimental, y partially_detected) siguen el mismo registro neutro,
    // nunca lenguaje de cumplimiento.
    status: {
      observation: {
        detected: "detectado",
        not_detected: "no detectado dentro del alcance",
        partially_detected: "detectado parcialmente",
        not_assessable: "no verificable",
        error: "no verificable (error del escáner)",
      },
      assessment: {
        aligned: "alineado con lo observado",
        action_recommended: "acción recomendada",
        not_applicable: "no aplica",
        insufficient_evidence: "evidencia insuficiente",
        experimental: "experimental",
      },
    },
    landing: {
      title: "IAXCORE · Escáner de Transparencia de IA",
      subtitle: "Introduce una URL pública para observar señales de transparencia de IA (Art. 50 AI Act).",
      urlLabel: "URL a escanear",
      urlPlaceholder: "https://ejemplo.com",
      submit: "Escanear",
      submitting: "Enviando…",
      errorInvalidUrl: "Introduce una URL pública válida (http o https).",
      errorRateLimited: "Se alcanzó el límite de escaneos para esta conexión. Inténtalo de nuevo más tarde.",
      errorGeneric: "No se pudo iniciar el escaneo. Inténtalo de nuevo.",
    },
    scan: {
      heading: "Evaluación",
      statusQueued: "En cola",
      statusRunning: "Escaneando",
      statusFailed: "El escaneo falló",
      pagesAnalyzed: "Páginas analizadas",
      method: "Método",
      noFindings: "Todavía no hay hallazgos que mostrar.",
      backToScan: "Escanear otra URL",
    },
  },
  en: {
    t1: {
      actionRecommended: "adding an explicit AI-interaction notice is recommended",
      humanChatDetected:
        "A support channel was detected that declares itself staffed by people; AI transparency signals do not apply within the observed scope.",
    },
    fix: {
      aiDisclosureNotice:
        "You are chatting with an AI assistant. This automated system is here to help answer your questions.",
      placementInstructions: "Show this notice as the first visible message when the chat opens, before the visitor can type.",
    },
    status: {
      observation: {
        detected: "detected",
        not_detected: "not detected within scope",
        partially_detected: "partially detected",
        not_assessable: "not verifiable",
        error: "not verifiable (scanner error)",
      },
      assessment: {
        aligned: "aligned with what was observed",
        action_recommended: "action recommended",
        not_applicable: "not applicable",
        insufficient_evidence: "insufficient evidence",
        experimental: "experimental",
      },
    },
    landing: {
      title: "IAXCORE · AI Transparency Scanner",
      subtitle: "Enter a public URL to observe AI-transparency signals (EU AI Act Art. 50).",
      urlLabel: "URL to scan",
      urlPlaceholder: "https://example.com",
      submit: "Scan",
      submitting: "Submitting…",
      errorInvalidUrl: "Enter a valid public URL (http or https).",
      errorRateLimited: "Scan limit reached for this connection. Try again later.",
      errorGeneric: "Could not start the scan. Please try again.",
    },
    scan: {
      heading: "Evaluation",
      statusQueued: "Queued",
      statusRunning: "Scanning",
      statusFailed: "Scan failed",
      pagesAnalyzed: "Pages analyzed",
      method: "Method",
      noFindings: "No findings to show yet.",
      backToScan: "Scan another URL",
    },
  },
} as const;

export type CopyLocale = keyof typeof COPY;

// §4: "test automático de copy debe fallar el build si aparecen [palabras prohibidas]".
export function findForbiddenWords(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_COPY_WORDS.filter((word) => lower.includes(word));
}

function collectStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string") {
    acc.push(value);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, acc);
    }
  }
  return acc;
}

export function allCopyStrings(): string[] {
  return collectStrings(COPY);
}
