import type { Detector } from "@iaxcore/core";

export { runT1Detection, t1Detector, type T1DetectionOptions } from "./t1Detector.js";
export { runT2Detection, t2Detector, type T2DetectionOptions } from "./t2Detector.js";

// T3 no se construye en este piloto (§5.3) — el contrato evita cerrar la
// puerta a retomarlo post-piloto sin tener que rediseñar la forma del dato.
function notImplemented(id: string): never {
  throw new Error(`${id}: detector not implemented yet — see spec §10 for its build phase`);
}

export const t3Detector: Detector<"t3"> = {
  id: "t3",
  version: "0.1.0",
  async run() {
    notImplemented("t3");
  },
};
