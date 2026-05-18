/**
 * A rota do spa-fallback é `*` (catch-all) — Vike não consegue prerenderizar
 * uma rota não-estática sem saber quais URLs gerar. Sem este hook, o build
 * emite zero HTML pro shell SPA e o deploy estático (Vercel) responde 404 em
 * `/`, `/login`, `/conta`, `/admin/*` etc.
 *
 * Retornando `["/"]`, Vike prerenderiza a página spa-fallback (ssr:false) na
 * URL `/` → emite `dist/client/index.html`: um shell client-only (root vazio +
 * script de hidratação) que monta `<BrowserRouter><App/></BrowserRouter>`. O
 * `vercel.json` reescreve todas as rotas não-estáticas pra esse `/index.html`,
 * e o React Router assume o controle no client (mesmo modelo do SPA original,
 * agora convivendo com as páginas /blog/* prerenderizadas como HTML real).
 */
export function onBeforePrerenderStart(): string[] {
  return ["/"]
}
