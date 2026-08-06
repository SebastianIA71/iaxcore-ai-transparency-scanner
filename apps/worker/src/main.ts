import { createDirectClient } from "@iaxcore/db";
import { runWorkerOnce, type WorkerConfig } from "@iaxcore/pipeline";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

const POLL_INTERVAL_MS = 2000;

async function main(): Promise<void> {
  const db = createDirectClient();
  const config: WorkerConfig = {
    workerId: process.env.WORKER_ID ?? `worker-${process.pid}`,
    signingKeyId: requireEnv("SIGNING_KEY_ID"),
    signingPrivateKeyBase64: requireEnv("SIGNING_PRIVATE_KEY_B64"),
  };

  console.log(`IAXCORE worker ${config.workerId} started — polling every ${POLL_INTERVAL_MS}ms`);

  for (;;) {
    const result = await runWorkerOnce(db, config);
    if (result.claimed) {
      console.log(`completed evaluation ${result.evaluationId}`);
    } else {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

main().catch((error) => {
  console.error("worker crashed", error);
  process.exitCode = 1;
});
