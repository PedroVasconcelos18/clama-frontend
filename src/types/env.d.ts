/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /**
   * Cloudflare Turnstile site key (público).
   * Default sandbox always-pass: "1x00000000000000000000AA".
   */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
