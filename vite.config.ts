import path from "node:path"
import { defineConfig, loadEnv, type ProxyOptions } from "vite"
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
          target: env.VITE_DEV_API_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
        },
        // Opcional, só em dev: espelha o rewrite de `/blog` do vercel.json para o WordPress (só leitura) e troca
        // os links absolutos `https://clama.me/blog` do HTML por `/blog`, para a navegação ficar no localhost.
        // O widget do post chama `/api/...` na mesma origem, ou seja, a API local.
        ...(env.VITE_DEV_BLOG_PROXY_TARGET
          ? ({
              "/blog": {
                target: env.VITE_DEV_BLOG_PROXY_TARGET,
                changeOrigin: true,
                rewrite: (p: string) => p.replace(/^\/blog/, "") || "/",
                selfHandleResponse: true,
                configure: (proxy) => {
                  proxy.on("proxyReq", (req) => req.setHeader("accept-encoding", "identity"))
                  proxy.on("proxyRes", (res, _req, out) => {
                    const html = (res.headers["content-type"] ?? "").includes("text/html")
                    const partes: Buffer[] = []
                    res.on("data", (c: Buffer) => partes.push(c))
                    res.on("end", () => {
                      let corpo = Buffer.concat(partes)
                      if (html) corpo = Buffer.from(corpo.toString("utf8").replaceAll("https://clama.me/blog", "/blog"))
                      const headers = { ...res.headers }
                      delete headers["content-length"]
                      if (typeof headers.location === "string") headers.location = headers.location.replace("https://clama.me/blog", "/blog")
                      out.writeHead(res.statusCode ?? 200, headers)
                      out.end(corpo)
                    })
                  })
                },
              },
            } satisfies Record<string, ProxyOptions>)
          : {}),
      },
    },
  }
})
