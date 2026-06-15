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
  // Deploy estático puro (sem adapter/SSR): prerender opt-in por página
  // (blog = prerender:true → SSG; spa-fallback ssr:false + prerender:true +
  // +onBeforePrerenderStart → emite dist/client/index.html shell). O Vercel
  // serve dist/client estático; vercel.json reescreve o resto pro shell.
  //
  // enable:false = parcial (só páginas que optam in). disableAutoRun:true =
  // o auto-run do prerender (que NÃO dispara no build do Vercel — causa do 404)
  // é desligado em TODO ambiente; o build script roda `vike prerender`
  // explícito como passo único e determinístico, com dist/server intacto.
  prerender: { enable: false, disableAutoRun: true },
} satisfies Config
