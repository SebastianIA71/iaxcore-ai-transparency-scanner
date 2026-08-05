import path from "node:path";
import { defineConfig } from "vitest/config";

// Espeja el alias "@/*" de tsconfig.json — vitest no lo lee de ahí solo.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
