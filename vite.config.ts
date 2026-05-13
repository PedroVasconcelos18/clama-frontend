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
    server: {
      allowedHosts,
    },
  }
})
