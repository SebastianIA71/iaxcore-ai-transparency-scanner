import { FORBIDDEN_COPY_WORDS } from "./vocabulary.js";

// Diccionario ES/EN — Fase 0 entregable (§10). Solo contiene las cadenas que
// la spec fija textualmente (§4, §5.1); el resto del copy de producto (landing,
// /method, etc.) se completa en Fase 7 sin reabrir este contrato.
export const COPY = {
  es: {
    t1: {
      actionRecommended: "se recomienda añadir un aviso explícito",
      humanChatDetected:
        "Se detectó un canal de atención que se declara atendido por personas; las señales de transparencia de IA no aplican dentro del alcance observado.",
    },
    // §10-Fase 4: texto del generador de aviso — a diferencia de lo de
    // arriba, la spec no fija esta redacción literalmente; vive aquí (no en
    // fix.ts) para que el barrido de palabras prohibidas de más abajo lo
    // cubra automáticamente, igual que el resto del diccionario.
    fix: {
      aiDisclosureNotice:
        "Estás hablando con un asistente virtual de inteligencia artificial. Este sistema automatizado está aquí para ayudarte.",
      placementInstructions:
        "Coloca este aviso como primer mensaje visible al abrir el chat, antes de que la persona pueda escribir.",
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
