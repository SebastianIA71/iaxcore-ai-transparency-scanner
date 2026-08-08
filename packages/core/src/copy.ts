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
      pageHeading: "Generador de aviso de IA",
      pageIntro:
        "Genera el mismo aviso accesible que T1 busca al evaluar un canal de interacción con IA. Cópialo y colócalo como primer mensaje visible del chat, antes de que la persona pueda escribir nada.",
      localeLabel: "Idioma del aviso",
      localeEs: "Español",
      localeEn: "Inglés",
      noticeHeading: "Texto del aviso",
      snippetHeading: "Fragmento HTML",
      placementHeading: "Dónde colocarlo",
      copyButton: "Copiar fragmento HTML",
      copied: "Copiado",
      contrastNote:
        "Los colores por defecto del fragmento alcanzan una relación de contraste de al menos 4.5:1 (AA, WCAG 2.1 §1.4.3) para texto normal.",
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
      // §14: "/r/{shareToken} — informe privado compartible y verificable".
      shareButton: "Compartir informe",
      shareLoading: "Generando enlace…",
      shareCopy: "Copiar",
      shareCopied: "Copiado",
      shareError: "No se pudo generar el enlace para compartir. Inténtalo de nuevo.",
      pdfDownload: "Descargar PDF",
      // §10-Fase 4: "Rescan" — repetir el escaneo de la misma URL tras
      // aplicar un fix, y comparar el veredicto T1 de antes/después.
      rescanButton: "Volver a escanear esta URL",
      rescanSubmitting: "Enviando…",
      rescanErrorRateLimited: "Se alcanzó el límite de escaneos para esta conexión. Inténtalo de nuevo más tarde.",
      rescanErrorGeneric: "No se pudo iniciar el rescan. Inténtalo de nuevo.",
      rescanOfNote: "Este informe es un rescan de una evaluación anterior.",
      viewOriginalScan: "Ver evaluación original",
      viewLatestRescan: "Ver rescan más reciente",
      rescanComparisonHeading: "Comparación con la evaluación anterior",
      rescanComparisonChanged: "El resultado de T1 cambió",
      rescanComparisonUnchanged: "El resultado de T1 no cambió",
      rescanComparisonResolved: "El aviso recomendado ya está en su sitio: T1 pasó de acción recomendada a alineado.",
    },
    // §10-Fase 7: "feedback estructurado" — un rating de 1 a 5 más un
    // comentario libre opcional, independiente del informe.
    feedback: {
      heading: "¿Te resultó útil este informe?",
      ratingLabel: "Valoración",
      commentLabel: "Comentario (opcional)",
      commentPlaceholder: "¿Algo que deberíamos saber?",
      submit: "Enviar valoración",
      submitting: "Enviando…",
      success: "Gracias por tu valoración.",
      errorGeneric: "No se pudo enviar la valoración. Inténtalo de nuevo.",
    },
    // §7/§10-Fase 7: "desbloqueo del 'expediente completo' con precio
    // visible... botón de intención 'Solicitar expediente' que captura el
    // lead cualificado (cobro manual o enlace de pago externo — no se
    // construye pasarela de pago)." Precio de ejemplo de la propia spec.
    dossier: {
      heading: "Expediente completo",
      price: "149 €",
      description:
        "Análisis detallado de todas las páginas del dominio, evidencia ampliada y acompañamiento para resolver los hallazgos. Sin compromiso de compra automática: al solicitarlo, te contactamos para los siguientes pasos.",
      emailLabel: "Email de contacto",
      emailPlaceholder: "tu@empresa.com",
      consentLabel: "Acepto que IAXCORE me contacte sobre este expediente.",
      submit: "Solicitar expediente completo",
      submitting: "Enviando…",
      success: "Gracias — te contactaremos en breve para los siguientes pasos.",
      errorInvalidEmail: "Introduce un email válido.",
      errorConsentRequired: "Marca la casilla de consentimiento para continuar.",
      errorGeneric: "No se pudo enviar la solicitud. Inténtalo de nuevo.",
    },
    // §8/§14: "/verify acepta evaluation_id (verificación por servidor,
    // piloto)... muestra la clave pública."
    verify: {
      heading: "Verificar un informe",
      subtitle:
        "Introduce el ID de una evaluación para comprobar que su informe está firmado con la clave pública de IAXCORE y no ha sido alterado.",
      idLabel: "ID de evaluación",
      idPlaceholder: "cmsh...",
      submit: "Verificar",
      submitting: "Verificando…",
      notFound: "No se encontró ninguna evaluación con ese ID.",
      errorGeneric: "No se pudo verificar. Inténtalo de nuevo.",
      resultValid: "Firma válida — este informe no ha sido alterado desde que se firmó.",
      resultInvalid: "La firma no es válida — el contenido no coincide con lo firmado originalmente.",
      resultNotCompleted: "Esta evaluación todavía no tiene un informe firmado.",
      resultNoSignature: "No se encontró ninguna firma para esta evaluación.",
      resultUnknownKey: "Este informe está firmado con una clave que no reconocemos.",
      fieldRequestedUrl: "URL escaneada",
      fieldKeyId: "Clave de firma",
      fieldHash: "Hash del informe",
      fieldCompletedAt: "Completado",
      publicKeyHeading: "Clave pública de verificación",
      publicKeyNote: "También publicada en /.well-known/iaxcore-keys.json.",
    },
    // §14/§19: metodología pública — versión, estados, límites del piloto,
    // comportamiento del banner de consentimiento y referencias normativas
    // (incluye el AI Omnibus, R6–R8).
    method: {
      heading: "Metodología",
      versionLabel: "Versión del método",
      version: "0.1",
      intro:
        "IAXCORE observa señales públicas sobre transparencia de IA en una URL pública y produce un informe firmado. No determina cumplimiento normativo ni sustituye asesoría profesional — analiza únicamente lo que es observable desde fuera.",
      statesHeading: "Estados de observación",
      statesIntro:
        "Cada sub-hallazgo (t1.channel, t1.ai_evidence, t1.disclosure, t2.visible_labelling) recibe uno de estos estados:",
      observationExplanations: {
        detected: "Se encontró la señal correspondiente dentro del alcance analizado.",
        not_detected:
          "No se encontró la señal dentro del alcance analizado — no implica que no exista fuera de ese alcance.",
        partially_detected: "Se encontró evidencia parcial, insuficiente por sí sola para una conclusión completa.",
        not_assessable: "No se pudo inspeccionar la señal — por ejemplo, un widget bloqueado o inaccesible.",
        error: "Un error del escáner impidió completar la inspección de esta señal.",
      },
      assessmentHeading: "Veredicto de T1",
      assessmentIntro:
        "Solo T1 produce un veredicto (assessmentStatus), calculado a partir de sus tres sub-hallazgos por una única función determinista y testeada exhaustivamente:",
      limitsHeading: "Límites de este piloto",
      limits: [
        "T1 solo evalúa un canal de interacción tipo chat o asistente — no cubre formularios, llamadas telefónicas ni canales fuera de la página analizada.",
        "T2 es informativo: registra etiquetas visibles de contenido generado por IA (leyendas, texto alternativo) en una sola página; no sigue enlaces ni produce un veredicto.",
        "T3 (procedencia técnica del contenido, por ejemplo C2PA) tiene su contrato definido pero no está implementado en este piloto.",
        "Se analizan hasta 5 páginas por dominio, seleccionadas de forma determinista.",
        "El escáner no envía mensajes a los widgets que encuentra, no crea conversaciones ni acepta términos en nombre de quien solicita el escaneo.",
        "La base de firmas de proveedores de IA es una semilla inicial, no un catálogo exhaustivo — se amplía con el tiempo.",
      ],
      consentBannerHeading: "Banner de cookies",
      consentBanner:
        "Si el escáner identifica con confianza un banner de cookies de un proveedor conocido, lo acepta dentro de un contexto de navegación aislado y desechable, exclusivo de esa evaluación, para poder continuar la inspección — este comportamiento queda registrado en el informe como consent_interaction. Si no puede identificarlo con confianza suficiente, no interactúa con él y el informe refleja cobertura parcial en vez de forzar una interacción.",
      referencesHeading: "Referencias normativas",
      references: [
        "Reglamento (UE) 2024/1689 (AI Act), artículo 50 — obligaciones de transparencia.",
        "Reglamento (UE) 2026/1744 (\"AI Omnibus\"), en vigor desde el 27 de julio de 2026, que modifica el Reglamento (UE) 2024/1689.",
        "Versión consolidada del Reglamento (UE) 2024/1689 a 27 de julio de 2026 (EUR-Lex, CELEX 02024R1689-20260727).",
        "AI Act Service Desk — cronología de implementación: la transición introducida por el AI Omnibus hasta el 2 de diciembre de 2026 afecta únicamente al marcado técnico del artículo 50.2, no a las obligaciones de transparencia que evalúa T1.",
      ],
    },
    // §14/§19: retención diferenciada (JSON indefinido / capturas 90 días)
    // y borrado de evidencias — sin sobreclamar automatizaciones que este
    // piloto todavía no implementa (ver la nota "todayNote" abajo).
    privacy: {
      heading: "Privacidad",
      intro:
        "IAXCORE analiza páginas públicas y trata de minimizar lo que guarda. Esta página describe qué datos genera un escaneo, cuánto tiempo se conservan y cómo solicitar su eliminación.",
      whatWeCollectHeading: "Qué se genera al escanear una URL",
      whatWeCollect: [
        "La evaluación en sí: URL solicitada, URL final, estado, páginas analizadas y el manifest del escaneo (páginas incluidas/excluidas, peticiones bloqueadas, si se interactuó con un banner de cookies).",
        "Los hallazgos de T1/T2: textos breves clasificados del canal de interacción encontrado (si lo hay), nunca el HTML completo de la página.",
        "El informe firmado (hash + firma Ed25519) que permite verificar que el resultado no se alteró.",
        "Si solicitas el expediente completo: tu email y tu consentimiento explícito de contacto — guardados aparte del informe, nunca mezclados con él.",
        "Si generas un enlace para compartir: solo el hash del token; el enlace en texto plano se muestra una única vez y no se vuelve a poder recuperar.",
      ],
      todayNote:
        "En este piloto el escáner no captura pantallazos ni imágenes de las páginas visitadas — solo los textos breves ya descritos arriba. Cuando se active la captura de evidencia visual, se aplicará la retención diferenciada de abajo.",
      retentionHeading: "Retención",
      retentionReport:
        "El JSON del informe se conserva indefinidamente — no contiene datos personales, solo señales técnicas sobre la página analizada.",
      retentionEvidence:
        "Las capturas de evidencia visual (cuando existan) se purgan a los 90 días, conservando su hash de contenido para que el informe siga siendo verificable aunque la captura ya no esté disponible.",
      retentionShareLink:
        "Los enlaces para compartir un informe caducan a los 30 días — siempre por debajo del plazo de retención de evidencia.",
      deletionHeading: "Eliminación de datos",
      deletion:
        "Puedes solicitar la revisión o eliminación de una evaluación concreta, o de los datos de contacto asociados a tu email, escribiendo al contacto de abajo.",
      contactHeading: "Contacto",
    },
    // §14/§19: identidad del rastreador, comportamiento documentado
    // (incluida la interacción con banners de consentimiento) y contacto
    // técnico.
    bot: {
      heading: "El rastreador de IAXCORE",
      intro:
        "Cuando escaneas una URL, IAXCORE visita esa página (y hasta 4 páginas más del mismo dominio) con un navegador automatizado. Esta página documenta cómo se identifica y qué hace.",
      userAgentHeading: "Identificación",
      userAgentNote:
        "El navegador se identifica ante cada sitio con la cabecera User-Agent \"IAXCOREBot/0.1 (+https://iaxcore-ai-transparency-scanner.vercel.app/bot)\".",
      robotsHeading: "robots.txt",
      robotsNote:
        "Antes de analizar cualquier página, el escáner consulta /robots.txt del dominio y respeta el grupo dirigido a \"IAXCOREBot\" si existe, o el grupo general (\"*\") en su defecto. Si robots.txt no existe o no se puede leer, se permite el análisis por defecto — comportamiento estándar de un rastreador.",
      behaviorHeading: "Comportamiento",
      behavior: [
        "Cada evaluación usa un contexto de navegación aislado y desechable, sin sesiones ni cookies de evaluaciones anteriores.",
        "Analiza como máximo 5 páginas del mismo dominio, seleccionadas de forma determinista.",
        "Todas las peticiones de red (no solo la página principal) pasan por un filtro que bloquea direcciones internas, de nube o reservadas antes de conectarse.",
        "Puede aceptar un banner de cookies de un proveedor identificado con confianza, dentro de ese mismo contexto desechable, para poder continuar la inspección — nunca si no lo identifica con confianza suficiente.",
        "No envía mensajes a widgets de chat, no crea conversaciones, no rellena formularios ni acepta términos en nombre de quien solicitó el escaneo.",
        "No guarda el HTML completo de las páginas visitadas.",
      ],
      optOutHeading: "Cómo excluir tu sitio",
      optOutNote:
        "Añade un grupo para \"IAXCOREBot\" en tu robots.txt con las reglas Disallow que quieras aplicar — el rastreador las respeta. También puedes escribirnos directamente.",
      contactHeading: "Contacto técnico",
    },
    contact: {
      email: "sebastianfont71@gmail.com",
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
      pageHeading: "AI disclosure notice generator",
      pageIntro:
        "Generate the same accessible notice T1 looks for when evaluating an AI interaction channel. Copy it and place it as the first visible message in the chat, before the visitor can type anything.",
      localeLabel: "Notice language",
      localeEs: "Spanish",
      localeEn: "English",
      noticeHeading: "Notice text",
      snippetHeading: "HTML snippet",
      placementHeading: "Where to place it",
      copyButton: "Copy HTML snippet",
      copied: "Copied",
      contrastNote: "The snippet's default colors reach a contrast ratio of at least 4.5:1 (AA, WCAG 2.1 §1.4.3) for normal text.",
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
      shareButton: "Share report",
      shareLoading: "Generating link…",
      shareCopy: "Copy",
      shareCopied: "Copied",
      shareError: "Could not generate the share link. Please try again.",
      pdfDownload: "Download PDF",
      rescanButton: "Rescan this URL",
      rescanSubmitting: "Submitting…",
      rescanErrorRateLimited: "Scan limit reached for this connection. Please try again later.",
      rescanErrorGeneric: "Could not start the rescan. Please try again.",
      rescanOfNote: "This report is a rescan of an earlier evaluation.",
      viewOriginalScan: "View original evaluation",
      viewLatestRescan: "View latest rescan",
      rescanComparisonHeading: "Comparison with the previous evaluation",
      rescanComparisonChanged: "The T1 result changed",
      rescanComparisonUnchanged: "The T1 result did not change",
      rescanComparisonResolved: "The recommended notice is now in place: T1 moved from action recommended to aligned.",
    },
    feedback: {
      heading: "Was this report useful?",
      ratingLabel: "Rating",
      commentLabel: "Comment (optional)",
      commentPlaceholder: "Anything we should know?",
      submit: "Submit rating",
      submitting: "Submitting…",
      success: "Thanks for your feedback.",
      errorGeneric: "Could not submit the rating. Please try again.",
    },
    dossier: {
      heading: "Full dossier",
      price: "€149",
      description:
        "Detailed analysis of every page on the domain, expanded evidence, and hands-on help resolving the findings. No automatic purchase commitment: requesting it just gets you contacted about next steps.",
      emailLabel: "Contact email",
      emailPlaceholder: "you@company.com",
      consentLabel: "I agree to be contacted by IAXCORE about this dossier.",
      submit: "Request full dossier",
      submitting: "Submitting…",
      success: "Thanks — we'll be in touch shortly about next steps.",
      errorInvalidEmail: "Enter a valid email.",
      errorConsentRequired: "Check the consent box to continue.",
      errorGeneric: "Could not submit the request. Please try again.",
    },
    verify: {
      heading: "Verify a report",
      subtitle:
        "Enter an evaluation ID to check that its report is signed with IAXCORE's public key and hasn't been altered.",
      idLabel: "Evaluation ID",
      idPlaceholder: "cmsh...",
      submit: "Verify",
      submitting: "Verifying…",
      notFound: "No evaluation was found with that ID.",
      errorGeneric: "Could not verify. Please try again.",
      resultValid: "Valid signature — this report hasn't been altered since it was signed.",
      resultInvalid: "Invalid signature — the content doesn't match what was originally signed.",
      resultNotCompleted: "This evaluation doesn't have a signed report yet.",
      resultNoSignature: "No signature was found for this evaluation.",
      resultUnknownKey: "This report is signed with a key we don't recognize.",
      fieldRequestedUrl: "Scanned URL",
      fieldKeyId: "Signing key",
      fieldHash: "Report hash",
      fieldCompletedAt: "Completed",
      publicKeyHeading: "Verification public key",
      publicKeyNote: "Also published at /.well-known/iaxcore-keys.json.",
    },
    method: {
      heading: "Methodology",
      versionLabel: "Method version",
      version: "0.1",
      intro:
        "IAXCORE observes public signals about AI transparency on a public URL and produces a signed report. It does not determine legal compliance and is not a substitute for professional advice — it only analyzes what's observable from the outside.",
      statesHeading: "Observation states",
      statesIntro:
        "Every sub-finding (t1.channel, t1.ai_evidence, t1.disclosure, t2.visible_labelling) gets one of these states:",
      observationExplanations: {
        detected: "The corresponding signal was found within the analyzed scope.",
        not_detected: "The signal wasn't found within the analyzed scope — this doesn't mean it doesn't exist outside that scope.",
        partially_detected: "Partial evidence was found, not enough on its own for a full conclusion.",
        not_assessable: "The signal couldn't be inspected — for example, a widget that was blocked or unreachable.",
        error: "A scanner error prevented completing the inspection of this signal.",
      },
      assessmentHeading: "T1's verdict",
      assessmentIntro:
        "Only T1 produces a verdict (assessmentStatus), computed from its three sub-findings by a single, deterministic, thoroughly tested function:",
      limitsHeading: "Limits of this pilot",
      limits: [
        "T1 only evaluates a chat/assistant-style interaction channel — it doesn't cover forms, phone calls, or channels outside the analyzed page.",
        "T2 is informative: it records visible labels for AI-generated content (captions, alt text) on a single page; it doesn't follow links or produce a verdict.",
        "T3 (technical content provenance, e.g. C2PA) has its contract defined but isn't implemented in this pilot.",
        "Up to 5 pages per domain are analyzed, chosen deterministically.",
        "The scanner never sends messages to the widgets it finds, never starts conversations, and never accepts terms on behalf of whoever requested the scan.",
        "The AI-provider signature base is a starting seed, not an exhaustive catalog — it grows over time.",
      ],
      consentBannerHeading: "Cookie banner",
      consentBanner:
        "If the scanner confidently identifies a cookie banner from a known provider, it accepts it inside an isolated, disposable browsing context scoped to that one evaluation, so it can keep inspecting the page — this is logged in the report as consent_interaction. If it can't identify one with enough confidence, it leaves it untouched and the report reflects partial coverage instead of forcing an interaction.",
      referencesHeading: "Regulatory references",
      references: [
        "Regulation (EU) 2024/1689 (AI Act), Article 50 — transparency obligations.",
        "Regulation (EU) 2026/1744 (\"AI Omnibus\"), in force since 27 July 2026, amending Regulation (EU) 2024/1689.",
        "Consolidated version of Regulation (EU) 2024/1689 as of 27 July 2026 (EUR-Lex, CELEX 02024R1689-20260727).",
        "AI Act Service Desk — implementation timeline: the transition introduced by the AI Omnibus, running until 2 December 2026, applies only to the technical marking obligations in Article 50.2, not to the transparency obligations T1 evaluates.",
      ],
    },
    privacy: {
      heading: "Privacy",
      intro:
        "IAXCORE analyzes public pages and tries to minimize what it stores. This page describes what data a scan generates, how long it's kept, and how to request its deletion.",
      whatWeCollectHeading: "What a URL scan generates",
      whatWeCollect: [
        "The evaluation itself: requested URL, final URL, status, pages analyzed, and the scan manifest (included/excluded pages, blocked requests, whether a cookie banner was interacted with).",
        "T1/T2 findings: short classified text snippets from any interaction channel found, never the page's full HTML.",
        "The signed report (hash + Ed25519 signature) that lets anyone verify the result wasn't altered.",
        "If you request the full dossier: your email and your explicit contact consent — stored separately from the report, never mixed with it.",
        "If you generate a share link: only the token's hash; the plaintext link is shown once and can't be retrieved again.",
      ],
      todayNote:
        "In this pilot the scanner doesn't capture screenshots or images of the pages it visits — only the short text snippets described above. Once visual evidence capture is turned on, the differentiated retention below will apply to it.",
      retentionHeading: "Retention",
      retentionReport:
        "The report JSON is kept indefinitely — it contains no personal data, only technical signals about the analyzed page.",
      retentionEvidence:
        "Visual evidence captures (once they exist) are purged after 90 days, keeping their content hash so the report stays verifiable even after the capture itself is gone.",
      retentionShareLink: "Share links expire after 30 days — always shorter than the evidence retention window.",
      deletionHeading: "Data deletion",
      deletion:
        "You can request review or deletion of a specific evaluation, or of the contact data tied to your email, by writing to the contact below.",
      contactHeading: "Contact",
    },
    bot: {
      heading: "IAXCORE's crawler",
      intro:
        "When you scan a URL, IAXCORE visits that page (and up to 4 more pages on the same domain) with an automated browser. This page documents how it identifies itself and what it does.",
      userAgentHeading: "Identification",
      userAgentNote:
        "The browser identifies itself to every site with the User-Agent header \"IAXCOREBot/0.1 (+https://iaxcore-ai-transparency-scanner.vercel.app/bot)\".",
      robotsHeading: "robots.txt",
      robotsNote:
        "Before analyzing any page, the scanner checks the domain's /robots.txt and honors the group addressed to \"IAXCOREBot\" if one exists, or the general (\"*\") group otherwise. If robots.txt doesn't exist or can't be read, analysis is allowed by default — standard crawler behavior.",
      behaviorHeading: "Behavior",
      behavior: [
        "Every evaluation uses an isolated, disposable browsing context, with no sessions or cookies carried over from previous evaluations.",
        "Analyzes at most 5 pages on the same domain, chosen deterministically.",
        "Every network request (not just the main page) passes through a filter that blocks internal, cloud, or reserved addresses before connecting.",
        "May accept a cookie banner from a confidently identified provider, inside that same disposable context, to keep inspecting the page — never if it can't identify one with enough confidence.",
        "Never sends messages to chat widgets, never starts conversations, never fills out forms, and never accepts terms on behalf of whoever requested the scan.",
        "Doesn't store the full HTML of the pages it visits.",
      ],
      optOutHeading: "How to opt your site out",
      optOutNote:
        "Add a group for \"IAXCOREBot\" to your robots.txt with whichever Disallow rules you want applied — the crawler honors them. You can also write to us directly.",
      contactHeading: "Technical contact",
    },
    contact: {
      email: "sebastianfont71@gmail.com",
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
