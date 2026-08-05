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
  },
  en: {
    t1: {
      actionRecommended: "adding an explicit AI-interaction notice is recommended",
      humanChatDetected:
        "A support channel was detected that declares itself staffed by people; AI transparency signals do not apply within the observed scope.",
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
