import type { Detector } from "@iaxcore/core";

// Fase 0 (§10, §19): solo el contrato de T1/T2/T3, sin implementación.
// T1 se construye en Fase 3, T2 en Fase 5 (no bloqueante para el piloto),
// T3 no se construye en este piloto (§5.3) — el contrato evita cerrar la
// puerta a retomarlo post-piloto sin tener que rediseñar la forma del dato.
function notImplemented(id: string): never {
  throw new Error(`${id}: detector not implemented yet — see spec §10 for its build phase`);
}

export const t1Detector: Detector<"t1"> = {
  id: "t1",
  version: "0.1.0",
  async run() {
    notImplemented("t1");
  },
};

export const t2Detector: Detector<"t2"> = {
  id: "t2",
  version: "0.1.0",
  async run() {
    notImplemented("t2");
  },
};

export const t3Detector: Detector<"t3"> = {
  id: "t3",
  version: "0.1.0",
  async run() {
    notImplemented("t3");
  },
};
