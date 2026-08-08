import vikeReact from "vike-react/config"
import type { Config } from "vike/types"

export default {
  extends: vikeReact,
  // Favicon global: o vike-react NÃO herda o <link rel="icon"> do index.html
  // nas páginas que ele renderiza (blog, spa-fallback shell) — só emite a tag
  // de favicon quando a config `favicon` está setada. Sem isto, o ícone da aba
  // some nessas páginas. Definir aqui no config raiz faz todas as páginas Vike
  // herdarem o mesmo favicon do Clama.
  favicon: "/favicon.svg",
  // Título padrão da aba: como o app é SPA (React Router) e não seta
  // document.title em runtime, sem um title aqui o shell prerenderizado sai
  // sem <title> e o navegador mostra a URL (ex.: "clama.me/confirmacao") na
  // aba. Definir no config raiz garante "Clama" como título padrão em todas
  // as páginas Vike; páginas específicas (ex.: blog) podem sobrescrever.
  title: "Clama | O Clamor que Nasce do Coração do Povo",
  // Deploy estático puro (sem adapter/SSR): prerender opt-in por página
  // (blog = prerender:true → SSG; spa-fallback ssr:false + prerender:true +
  // +onBeforePrerenderStart → emite dist/client/index.html shell). O Vercel
  // serve dist/client estático; vercel.json reescreve o resto pro shell.
  //
  // enable:false = parcial (só páginas que optam in). disableAutoRun:true =
  // o auto-run do prerender (que NÃO dispara no build do Vercel — causa do 404)
  // é desligado em TODO ambiente; o build script roda `vike prerender`
  // explícito como passo único e determinístico, com dist/server intacto.
  // ⚠️ `enable: true` desde que as rotas do blog sairam.
  //
  // Antes ficava `false`, e funcionava porque as paginas do blog opinavam
  // `prerender: true` individualmente — era isso que ligava o pre-render e, de
  // carona, emitia o `index.html` do spa-fallback.
  //
  // Removidas elas, o `vike prerender` passou a sair com codigo 0 e **nao gerar
  // arquivo nenhum**: sem `dist/client/index.html`, o catch-all do vercel.json
  // aponta para um arquivo que nao existe e o site inteiro cai. Build verde,
  // deploy verde, site fora.
  prerender: { enable: true, disableAutoRun: true },

  /**
   * 🔴 Client Routing do Vike DESLIGADO — e isso resolve uma classe de bug,
   * nao um link.
   *
   * Quem roteia este app e o React Router. O Vike e so a casca que emite o
   * `index.html`. Enquanto existiam paginas Vike (o blog), o Client Routing
   * dele fazia sentido; hoje a unica pagina e o catch-all `spa-fallback`.
   *
   * Com ele ligado, o Vike intercepta clique em QUALQUER link de mesma
   * origem, empurra o historico e re-renderiza a mesma pagina Vike. O React
   * Router nao escuta essa troca de historico, entao a URL muda e a tela
   * nao — foi o sintoma de "clico em Blog e nao vai" e de "clico em Clama
   * estando no /conta e nao sai do lugar".
   *
   * Desligado: link interno navega de verdade, e o roteamento suave dentro
   * do app continua pelo React Router, que e quem sempre mandou aqui.
   */
  clientRouting: false,
} satisfies Config
