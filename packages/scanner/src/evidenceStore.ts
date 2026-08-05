import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// §8: "EvidenceStore local en desarrollo, interfaz preparada para S3." La
// interfaz no expone rutas de filesystem al caller más allá del
// storagePath opaco que ella misma genera — cambiar de implementación
// (p. ej. a S3) no debería tocar nada fuera de este módulo.
export interface SavedEvidence {
  contentHash: string;
  storagePath: string;
}

export interface EvidenceStore {
  save(key: string, data: Buffer): Promise<SavedEvidence>;
  read(storagePath: string): Promise<Buffer>;
}

function hashContent(data: Buffer): string {
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

// §9: "no almacenar HTML completo; guardar únicamente la evidencia mínima
// necesaria" y "capturas se purgan a los 90 días conservando su
// contentHash" — la purga en sí (Fase 7/mantenimiento) no vive aquí, pero
// el contentHash se calcula siempre para que sobreviva a la purga del
// archivo.
export function createLocalEvidenceStore(baseDir: string): EvidenceStore {
  return {
    async save(key, data) {
      const contentHash = hashContent(data);
      const storagePath = path.join(baseDir, key);
      await mkdir(path.dirname(storagePath), { recursive: true });
      await writeFile(storagePath, data);
      return { contentHash, storagePath };
    },
    async read(storagePath) {
      return readFile(storagePath);
    },
  };
}
