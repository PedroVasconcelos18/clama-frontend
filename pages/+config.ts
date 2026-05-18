import vikeReact from "vike-react/config"
// Bug de tipos upstream: o entry ./config de @vite-plugin-vercel/vike
// re-exporta de "./dist/+config.h" (arquivo inexistente), então o TS não
// enxerga o default export. Ele EXISTE em runtime (dist/+config.js faz
// `export { config_default as default }`) e o `exports` do pacote bloqueia
// importar o caminho interno tipado. Remover quando o pacote corrigir os tipos.
// @ts-expect-error -- default ausente só nos tipos, presente em runtime
import vercel from "@vite-plugin-vercel/vike/config"
import type { Config } from "vike/types"

export default {
  extends: [vikeReact, vercel],
  // enable:false = prerender opt-in por página (blog/shell têm prerender:true).
  // keepDistServer:true contorna bug Vike 0.4.259 ↔ adapter 9.1.0: o
  // runPrerender.js:131 faz rmSync('dist/server') SEM force; sob o adapter o
  // outDir muda e dist/server nunca existe → ENOENT. keepDistServer pula esse
  // rmSync (https://vike.dev/prerender#keepDistServer).
  prerender: { enable: false, keepDistServer: true },
  // Habilita o universal-deploy do Vike (exigido pelo vite-plugin-vercel).
  // `server: true` faz o Vike usar a entry serverless built-in (`vike/fetch`)
  // — sem precisar de arquivo +server.ts. Confirmado em
  // vike/.../pluginUniversalDeploy/getServerConfig.js.
  server: true,
} satisfies Config
