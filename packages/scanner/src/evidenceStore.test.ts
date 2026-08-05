import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalEvidenceStore } from "./evidenceStore.js";

describe("createLocalEvidenceStore (§8, §9)", () => {
  let baseDir: string;

  afterEach(async () => {
    if (baseDir) {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it("guarda un archivo y devuelve un contentHash sha256 determinista", async () => {
    baseDir = path.join(os.tmpdir(), `iaxcore-evidence-${randomUUID()}`);
    const store = createLocalEvidenceStore(baseDir);

    const data = Buffer.from("captura de pantalla falsa");
    const saved = await store.save("eval_1/finding_1/screenshot.png", data);

    expect(saved.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);

    const again = await store.save("eval_1/finding_1/screenshot-2.png", data);
    expect(again.contentHash).toBe(saved.contentHash); // mismo contenido → mismo hash
  });

  it("read() devuelve exactamente lo que se guardó", async () => {
    baseDir = path.join(os.tmpdir(), `iaxcore-evidence-${randomUUID()}`);
    const store = createLocalEvidenceStore(baseDir);

    const data = Buffer.from("contenido de evidencia");
    const saved = await store.save("nested/path/evidence.bin", data);

    const readBack = await store.read(saved.storagePath);
    expect(readBack.equals(data)).toBe(true);
  });

  it("crea los directorios intermedios que hagan falta", async () => {
    baseDir = path.join(os.tmpdir(), `iaxcore-evidence-${randomUUID()}`);
    const store = createLocalEvidenceStore(baseDir);
    await expect(store.save("a/b/c/d/file.txt", Buffer.from("x"))).resolves.toBeDefined();
  });
});
