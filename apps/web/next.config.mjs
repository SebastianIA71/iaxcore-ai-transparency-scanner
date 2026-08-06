/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes del workspace sin build propio (main apunta a ./src/index.ts)
  // — Next necesita transpilarlos él mismo. scanner/detectors/pipeline se
  // suman aquí porque POST /api/scans ahora corre runWorkerOnce() en línea
  // (ver su comentario) — antes solo hacían falta en apps/worker, que no
  // pasa por el build de Next.
  transpilePackages: ["@iaxcore/core", "@iaxcore/db", "@iaxcore/scanner", "@iaxcore/detectors", "@iaxcore/pipeline"],
  // playwright/playwright-core y @sparticuz/chromium tienen binarios
  // nativos/assets que webpack no debe intentar empaquetar — se cargan tal
  // cual en tiempo de ejecución, igual que en cualquier entorno Node normal.
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  webpack: (config) => {
    // Esos paquetes importan con extensión ".js" apuntando a archivos
    // ".ts" (estilo NodeNext) — tsc/vitest lo resuelven solos, pero el
    // webpack de Next no, salvo que se le diga explícitamente.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
