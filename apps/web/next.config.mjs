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
  // serverExternalPackages solo evita que webpack procese el JS de
  // @sparticuz/chromium — no fuerza a Next a copiar su carpeta bin/ (el
  // Chromium comprimido en sí) dentro del paquete de la función. Sin esto,
  // el deploy compila bien pero falla en runtime: "input directory .../bin
  // does not exist" en cuanto POST /api/scans intenta lanzar el navegador.
  // npm workspaces hoists @sparticuz/chromium to the monorepo root's
  // node_modules (it's a dependency of packages/scanner, not apps/web
  // directly) — include both possible locations since which one applies
  // depends on exactly how Next resolves the glob base, and an
  // unmatched pattern is harmless.
  outputFileTracingIncludes: {
    "/api/scans": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "../../node_modules/@sparticuz/chromium/bin/**",
    ],
  },
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
