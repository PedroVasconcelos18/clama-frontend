import type { Config } from "vike/types"

// SPA shell estático: ssr:false (app é client-side via React Router) +
// prerender:true pra Vike emitir um HTML estático que o Vercel serve como
// fallback de todas as rotas não-prerendered (vercel.json reescreve pra cá).
// Sem prerender:true não existe HTML do shell na saída → 404 em deploy estático.
export default {
  ssr: false,
  prerender: true,
} satisfies Config
