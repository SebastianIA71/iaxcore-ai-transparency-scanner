/** @type {import('next').NextConfig} */
const nextConfig = {
  // @iaxcore/core y @iaxcore/db son paquetes del workspace sin build propio
  // (main apunta a ./src/index.ts) — Next necesita transpilarlos él mismo.
  transpilePackages: ["@iaxcore/core", "@iaxcore/db"],
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
