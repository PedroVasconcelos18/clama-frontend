import vikeReact from "vike-react/config"
import type { Config } from "vike/types"

export default {
  extends: vikeReact,
  // Deploy estático puro (sem adapter/SSR): prerender opt-in por página
  // (blog = prerender:true → SSG; spa-fallback ssr:false + prerender:true +
  // +onBeforePrerenderStart → emite dist/client/index.html shell). O Vercel
  // serve dist/client estático; vercel.json reescreve o resto pro shell.
  prerender: false,
} satisfies Config
