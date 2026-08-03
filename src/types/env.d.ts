/// <reference types="vite/client" />
interface ImportMetaEnv {
  /**
   * Base das chamadas de API feitas pelo navegador.
   * Vazio = caminho relativo, resolvido pelo rewrite de `/api/*` (vercel.json
   * em produção, `server.proxy` do Vite em dev).
   */
  readonly VITE_API_URL: string
  /**
   * Base absoluta usada apenas pelo código que roda em Node no prerender do
   * Vike (`pages/blog/**\/+data.ts`, `+onBeforePrerenderStart.ts`).
   * `fetch` em Node não resolve caminho relativo — se `VITE_API_URL` estiver
   * vazio, estes arquivos precisam de um host absoluto ou o build quebra.
   */
  readonly VITE_API_URL_SSR?: string
  /**
   * Destino do proxy de `/api` no dev server do Vite. Default: localhost:8000.
   */
  readonly VITE_DEV_API_PROXY_TARGET?: string
  /**
   * Cloudflare Turnstile site key (público).
   * Default sandbox always-pass: "1x00000000000000000000AA".
   */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
