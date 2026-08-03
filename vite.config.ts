import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import vike from "vike/plugin"
import { visualizer } from "rollup-plugin-visualizer"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
    : []

  const analyze = process.env.ANALYZE === "1"

  return {
    plugins: [
      react(),
      vike(),
      ...(analyze
        ? [
            visualizer({
              filename: "dist/bundle-stats.html",
              gzipSize: true,
              brotliSize: false,
              template: "treemap",
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      holdUntilCrawlEnd: false,
    },
    server: {
      port: 5173,
      strictPort: false,
      allowedHosts,
      // Espelha em dev o rewrite de `/api/*` que o vercel.json faz em produção.
      // Sem isso, com VITE_API_URL vazio o fetch relativo bate no próprio Vite
      // e recebe o index.html da SPA — falha silenciosa com status 200.
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  }
})
