import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiOrigin = `http://localhost:${env.PORT || "3000"}`;

  return {
    envDir: repoRoot,
    plugins: [react()],
    server: {
      // unless noted, the options in this section are only applied to dev.
      port: 5173,
      proxy: {
        "/api": apiOrigin,
        "/healthz": apiOrigin
      }
    }
  };
});
