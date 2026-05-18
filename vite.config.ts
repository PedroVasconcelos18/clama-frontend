import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import vike from "vike/plugin"
import vercel from "vite-plugin-vercel"
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
      // Adapter oficial Vike→Vercel: gera .vercel/output (Build Output API v3)
      // — estático pros prerenderizados + Serverless Function pro SSR. Ele
      // auto-carrega @vite-plugin-vercel/vike (extends em pages/+config.ts).
      vercel(),
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
    },
  }
})
