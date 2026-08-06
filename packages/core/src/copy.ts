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
      coverageHeading: "Cobertura del escaneo",
      pageStatusCompleted: "completada",
      pageStatusExcluded: "excluida",
      exclusionReasonFallback: "no se pudo analizar por un motivo no catalogado",
      // Claves = PageExclusionReason (packages/scanner/src/scan.ts) — sin
      // importar ese tipo aquí (core no depende de scanner), solo hace
      // falta que las claves coincidan; una clave que falte cae en
      // exclusionReasonFallback en vez de romper la página.
      exclusionReasons: {
        request_limit: "se alcanzó el límite de peticiones de red por escaneo (protección contra abuso) antes de poder cargarla",
        redirect_limit: "la página redirigía demasiadas veces seguidas",
        resource_size_limit: "un recurso de la página superaba el tamaño máximo permitido",
        total_size_limit: "se alcanzó el límite de datos descargados en este escaneo",
        navigation_timeout: "la página tardó demasiado en responder",
        navigation_failed: "no se pudo cargar la página (fallo de red)",
        http_error: "el servidor respondió con un error",
        time_budget_exceeded: "se alcanzó el límite de tiempo del escaneo antes de llegar a esta página",
        invalid_url: "la URL no es válida",
        disallowed_protocol: "el protocolo de la URL no está permitido",
        disallowed_port: "el puerto de la URL no está permitido",
        loopback: "la URL apunta a una dirección local — bloqueada por seguridad",
        private_range: "la URL apunta a una red privada — bloqueada por seguridad",
        link_local: "la URL apunta a una dirección de enlace local — bloqueada por seguridad",
        cloud_metadata: "la URL apunta a un servicio interno de nube — bloqueada por seguridad",
        reserved_range: "la URL apunta a un rango de direcciones reservado — bloqueada por seguridad",
        multicast_or_broadcast: "la URL apunta a una dirección de difusión — bloqueada por seguridad",
        unspecified: "la URL no especifica un destino válido",
        unresolved_hostname: "no se pudo resolver el nombre de dominio",
      },
      blockedRequestsNote: "recursos de la página bloqueados por los límites de seguridad del escaneo (no impide leer el contenido, solo protege contra abuso)",
      // Claves = AssessmentStatus (packages/core/src/vocabulary.ts).
      assessmentExplanations: {
        aligned:
          "Se detectó un canal de interacción con IA y un aviso visible antes del primer mensaje posible.",
        action_recommended:
          "Se detectó un canal de interacción con IA sin un aviso claro visible al abrirlo — por eso se recomienda añadir uno.",
        not_applicable:
          "No se detectó ningún canal de interacción con IA dentro del alcance analizado (o el canal encontrado no corresponde a IA — por ejemplo, atención humana o un intermediario).",
        insufficient_evidence:
          "No hay evidencia suficiente para concluir si hay interacción con IA — el canal encontrado es ambiguo, no se pudo inspeccionar, o el escáner fue bloqueado.",
        experimental: "Resultado experimental, no evaluable en este piloto.",
      },
      // Claves = EvaluationManifest.consent_interaction.
      consentInteraction: {
        accepted_banner: "El escáner aceptó un banner de cookies para poder continuar la inspección.",
        not_detected: "No se detectó ningún banner de cookies, o no se identificó con confianza suficiente.",
        declined: "Se detectó un banner de cookies y no se interactuó con él.",
        not_attempted: "No se llegó a comprobar si había banner de cookies.",
      },
      // §5.2/§10-Fase 5: T2 es informativo, no evaluable — su copy nunca
      // debe sonar a acusación cuando no encuentra nada (regla dura: nunca
      // action_recommended solo por no detectar una etiqueta).
      t2Heading: "Etiquetado visible de contenido con IA",
      t2Detected: "señal(es) de etiquetado encontradas",
      t2NotDetected:
        "No se encontraron etiquetas visibles de contenido generado o manipulado por IA en esta página. Esto no significa que el contenido no esté generado por IA — solo que no se encontró una etiqueta visible en el alcance analizado.",
      t2Error: "No se pudo inspeccionar esta página en busca de etiquetas.",
      t2SignalLocations: {
        figcaption: "leyenda de imagen o vídeo",
        alt: "texto alternativo de una imagen",
        "aria-label": "etiqueta de accesibilidad",
        "caption-text": "texto junto a una imagen",
      },
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
      coverageHeading: "Scan coverage",
      pageStatusCompleted: "completed",
      pageStatusExcluded: "excluded",
      exclusionReasonFallback: "could not be analyzed for an uncatalogued reason",
      exclusionReasons: {
        request_limit: "the per-scan network request limit (abuse protection) was reached before it could load",
        redirect_limit: "the page redirected too many times in a row",
        resource_size_limit: "a resource on the page exceeded the maximum allowed size",
        total_size_limit: "the total data limit for this scan was reached",
        navigation_timeout: "the page took too long to respond",
        navigation_failed: "the page could not be loaded (network failure)",
        http_error: "the server responded with an error",
        time_budget_exceeded: "the scan's time budget was reached before getting to this page",
        invalid_url: "the URL is not valid",
        disallowed_protocol: "the URL's protocol is not allowed",
        disallowed_port: "the URL's port is not allowed",
        loopback: "the URL points to a local address — blocked for safety",
        private_range: "the URL points to a private network — blocked for safety",
        link_local: "the URL points to a link-local address — blocked for safety",
        cloud_metadata: "the URL points to an internal cloud service — blocked for safety",
        reserved_range: "the URL points to a reserved address range — blocked for safety",
        multicast_or_broadcast: "the URL points to a broadcast address — blocked for safety",
        unspecified: "the URL does not specify a valid destination",
        unresolved_hostname: "the domain name could not be resolved",
      },
      blockedRequestsNote: "page resources blocked by the scan's safety limits (this doesn't prevent reading the content, it only guards against abuse)",
      assessmentExplanations: {
        aligned: "An AI interaction channel was detected along with a notice visible before the first possible message.",
        action_recommended:
          "An AI interaction channel was detected without a clear notice visible when it opens — that's why adding one is recommended.",
        not_applicable:
          "No AI interaction channel was detected within the analyzed scope (or the channel found isn't AI — e.g. human support or an intermediary).",
        insufficient_evidence:
          "There isn't enough evidence to conclude whether there's AI interaction — the channel found is ambiguous, couldn't be inspected, or the scanner was blocked.",
        experimental: "Experimental result, not evaluable in this pilot.",
      },
      consentInteraction: {
        accepted_banner: "The scanner accepted a cookie banner in order to continue inspecting the page.",
        not_detected: "No cookie banner was detected, or it couldn't be identified with enough confidence.",
        declined: "A cookie banner was detected and left untouched.",
        not_attempted: "Whether there was a cookie banner was never checked.",
      },
      t2Heading: "Visible AI content labelling",
      t2Detected: "signal(s) found",
      t2NotDetected:
        "No visible labels for AI-generated or AI-manipulated content were found on this page. This doesn't mean the content isn't AI-generated — only that no visible label was found within the analyzed scope.",
      t2Error: "This page could not be inspected for labels.",
      t2SignalLocations: {
        figcaption: "image or video caption",
        alt: "an image's alt text",
        "aria-label": "accessibility label",
        "caption-text": "text next to an image",
      },
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
