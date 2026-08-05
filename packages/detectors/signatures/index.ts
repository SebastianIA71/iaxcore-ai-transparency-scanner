// §5.1/§10-Fase 3 (B1): "tres clases versionadas (ai_native, ambiguous,
// human_first)... es el detector más difícil del producto; su base de
// firmas requiere mantenimiento humano continuo (curación de proveedores),
// no solo ingeniería." Esta es una semilla inicial, no un catálogo
// exhaustivo — se amplía cuando la métrica de insufficient_evidence (§13)
// lo justifique, sin relajar la semántica de las tres clases.
export type ProviderClass = "ai_native" | "ambiguous" | "human_first";

export interface ProviderSignature {
  id: string;
  vendor: string;
  class: ProviderClass;
  // Variables globales que el propio script del proveedor deja en `window`
  // — más estable entre versiones que un selector CSS, que estos vendors
  // cambian con frecuencia (no incluimos selectores DOM por proveedor aquí
  // por la misma razón: no se pueden verificar en vivo desde este entorno,
  // y un selector equivocado falla en silencio hacia "no detectado", que es
  // el modo de fallo seguro — channelDetection.ts usa heurísticas de texto
  // genéricas como mecanismo principal, esto es solo una señal de refuerzo).
  globals?: string[];
  // Dominios donde estos proveedores sirven su script/iframe de carga —
  // coincide contra script[src]/iframe[src], no contra el DOM del widget en sí.
  scriptSrcPatterns?: RegExp[];
}

// ai_native: el producto ES un agente de IA — no una plataforma de chat
// genérica que un cliente podría estar operando con personas. Afirmar esto
// por marca es defendible; afirmar "human_first" por marca no lo es (casi
// cualquier plataforma de chat genérica ha añadido IA en algún plan) — por
// eso esta semilla no incluye ninguna entrada `human_first`: esa clase solo
// se deriva de texto observado en la página concreta (ver classification.ts),
// nunca de la identidad del proveedor.
export const PROVIDER_SIGNATURES: ProviderSignature[] = [
  {
    id: "intercom-fin",
    vendor: "Intercom Fin",
    class: "ai_native",
    globals: ["Intercom"],
    scriptSrcPatterns: [/widget\.intercom\.io/i],
  },
  {
    id: "ada",
    vendor: "Ada",
    class: "ai_native",
    globals: ["adaEmbed", "adaSettings"],
    scriptSrcPatterns: [/static\.ada\.support/i, /\bada\.support\b/i],
  },
  {
    id: "forethought",
    vendor: "Forethought",
    class: "ai_native",
    globals: ["Forethought", "ForethoughtWidgetConfig"],
    scriptSrcPatterns: [/solve-widget\.forethought\.ai/i],
  },
  // ambiguous: soportan tanto bots de IA como agentes humanos según cómo
  // los configure quien los instala — la sola presencia del vendor no dice
  // nada sobre cuál está activo en esta página concreta.
  {
    id: "zendesk",
    vendor: "Zendesk",
    class: "ambiguous",
    globals: ["zE", "zEmbed"],
    scriptSrcPatterns: [/static\.zdassets\.com/i, /\bzendesk\.com\/embeddable/i],
  },
  {
    id: "intercom-generic",
    vendor: "Intercom",
    class: "ambiguous",
    globals: ["Intercom"],
    scriptSrcPatterns: [/widget\.intercom\.io/i],
  },
  {
    id: "drift",
    vendor: "Drift",
    class: "ambiguous",
    globals: ["drift", "driftt"],
    scriptSrcPatterns: [/js\.driftt\.com/i],
  },
  {
    id: "crisp",
    vendor: "Crisp",
    class: "ambiguous",
    globals: ["$crisp", "CRISP_WEBSITE_ID"],
    scriptSrcPatterns: [/client\.crisp\.chat/i],
  },
  {
    id: "hubspot-conversations",
    vendor: "HubSpot Conversations",
    class: "ambiguous",
    globals: ["HubSpotConversations"],
    scriptSrcPatterns: [/js\.hs-scripts\.com/i, /js\.usemessages\.com/i],
  },
  {
    id: "freshchat",
    vendor: "Freshchat",
    class: "ambiguous",
    globals: ["fcWidget"],
    scriptSrcPatterns: [/wchat\.freshchat\.com/i],
  },
  {
    id: "tidio",
    vendor: "Tidio",
    class: "ambiguous",
    globals: ["tidioChatApi"],
    scriptSrcPatterns: [/code\.tidio\.co/i],
  },
  {
    id: "tawkto",
    vendor: "Tawk.to",
    class: "ambiguous",
    globals: ["Tawk_API"],
    scriptSrcPatterns: [/embed\.tawk\.to/i],
  },
  {
    id: "livechat",
    vendor: "LiveChat",
    class: "ambiguous",
    globals: ["LC_API", "__lc"],
    scriptSrcPatterns: [/cdn\.livechatinc\.com/i],
  },
];
