// §10-Fase 3: "patrones ES/EN/FR/DE/IT/PT". Semilla inicial de frases —
// igual que las firmas de proveedor (signatures/index.ts), esto necesita
// curación continua, no es un catálogo cerrado. Cada lista está separada
// por lo que prueba, no por dónde se usa, para que un patrón mal
// clasificado sea fácil de mover sin tocar la lógica de detección.

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

// t1.ai_evidence (amplio): cualquier mención de que hay IA/chatbot detrás
// del canal — deliberadamente más permisivo que DISCLOSURE_PATTERNS, que
// exige que el aviso se dirija al visitante, no solo que mencione IA en
// algún sitio de la página.
export const AI_EVIDENCE_PATTERNS: readonly RegExp[] = [
  /\bai assistant\b/i,
  /\bartificial intelligence\b/i,
  /\bvirtual assistant\b/i,
  /\bchatbot\b/i,
  /powered by ai/i,
  /generative ai/i,
  /large language model/i,
  /\bchatgpt\b/i,
  /\bopenai\b/i,
  /\bai-powered\b/i,
  /\bai agent\b/i,
  /\banswer bot\b/i,
  /asistente de ia/i,
  /asistente virtual/i,
  /inteligencia artificial/i,
  /impulsado por ia/i,
  /agente de ia/i,
  /ia generativa/i,
  /assistant ia/i,
  /intelligence artificielle/i,
  /agent ia/i,
  /propuls[ée] par l'ia/i,
  /ki-assistent/i,
  /künstliche intelligenz/i,
  /ki-gestützt/i,
  /assistente ia/i,
  /intelligenza artificiale/i,
  /assistente virtuale/i,
  /assistente de ia/i,
  /inteligência artificial/i,
  /assistente virtual/i,
] as const;

// t1.disclosure (estricto): el aviso se dirige explícitamente a quien
// visita la página ("estás hablando con...", "you are chatting with...")
// — no basta con que la página mencione IA en otro contexto.
export const DISCLOSURE_PATTERNS: readonly RegExp[] = [
  /you('| a)re (now )?chatting with (an|our) (ai|virtual assistant)/i,
  /this is an ai assistant/i,
  /i('m| am) an ai\b/i,
  /you('re| are) talking to a virtual assistant powered by ai/i,
  /estás (hablando|chateando) con (un|una) (ia|asistente virtual)/i,
  /soy (un|una) (ia|asistente virtual)/i,
  /este es un asistente de inteligencia artificial/i,
  /vous discutez avec une ia/i,
  /je suis un assistant virtuel/i,
  /ceci est un assistant ia/i,
  /sie chatten mit einer ki/i,
  /ich bin ein ki-assistent/i,
  /dies ist ein ki-assistent/i,
  /stai parlando con un'?ia/i,
  /sono un assistente virtuale/i,
  /questo è un assistente ia/i,
  /você está conversando com uma ia/i,
  /sou um assistente virtual/i,
  /este é um assistente de ia/i,
] as const;

// t1.ai_evidence.evidence_of_human: el canal se declara explícitamente
// atendido por personas, sin mención de IA.
export const HUMAN_EVIDENCE_PATTERNS: readonly RegExp[] = [
  /chat(ting)? with our (support )?team/i,
  /you('re| are) chatting with a real person/i,
  /talk to a human/i,
  /our (support )?team will (respond|get back to you)/i,
  /hablas? con (nuestro equipo|una persona real)/i,
  /chatea con una persona real/i,
  /nuestro equipo te responder[áa]/i,
  /notre équipe vous répond/i,
  /unser team antwortet/i,
  /il nostro team ti risponder[àa]/i,
  /nossa equipe (vai )?responder/i,
] as const;

// t1.channel human_intermediary_detected: el canal enruta a una persona de
// forma asíncrona (formulario/email) en vez de ofrecer interacción en vivo
// — por eso cuenta como "sin canal" a efectos de §5.1, no como chat humano.
export const HUMAN_INTERMEDIARY_PATTERNS: readonly RegExp[] = [
  /we('ll| will) get back to you/i,
  /leave a message and we('ll| will) (respond|reply)/i,
  /our team will email you/i,
  /respons(e|es) within \d+ hours?/i,
  /te responderemos por (email|correo)/i,
  /déjanos tu (mensaje|email)/i,
  /te contestaremos en \d+ horas?/i,
  /nous vous répondrons par e-?mail/i,
  /wir antworten ihnen per e-?mail/i,
  /ti risponderemo via e-?mail/i,
  /responderemos por e-?mail/i,
] as const;

// obviousness_signals.assistant_name_suggests_ai: nombre/etiqueta del
// asistente que ya sugiere por sí mismo que es una máquina.
export const AI_SUGGESTIVE_NAME_PATTERNS: readonly RegExp[] = [
  /\bbot\b/i,
  /\bai\b/i,
  /\bassistant\b/i,
  /asistente/i,
  /robot/i,
] as const;

// t2.visible_labelling (§5.2): etiquetas de contenido generado/manipulado
// por IA — frases cortas, del tipo que aparece en un figcaption/alt/aria-
// label, no menciones sueltas de "IA" en un párrafo cualquiera. Deliberado:
// labelDetection.ts solo prueba estos patrones contra candidatos ya
// filtrados por posición en el DOM (figcaption, alt, aria-label, texto
// corto junto a un <figure>) — nunca contra el cuerpo de texto genérico de
// la página. Esa combinación (patrón + posición) es lo que evita el falso
// positivo de F12 ("texto editorial que habla de IA"), no el patrón solo.
export const AI_LABEL_PATTERNS: readonly RegExp[] = [
  /ai[ -]generated/i,
  /generated (by|with) ai/i,
  /made with ai/i,
  /created with ai/i,
  /synthetic media/i,
  /generad[oa]s? (con|por) ia/i,
  /contenido sintético/i,
  /cread[oa] con ia/i,
  /généré[e]? (par|avec) l'?ia/i,
  /média synthétique/i,
  /ki-generiert/i,
  /von ki generiert/i,
  /synthetische medien/i,
  /generat[oa] (con|dall'?)ia/i,
  /media sintetico/i,
  /gerad[oa] (por|com) ia/i,
  /mídia sintética/i,
] as const;
