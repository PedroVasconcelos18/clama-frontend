/**
 * Ordem das regras do `vercel.cutover.json` (Story 6.1).
 *
 * ⚠️ **O modo de falha aqui é silencioso**, e é a razão de a story existir.
 * Uma regra fora de ordem não produz erro de build, não falha o deploy e não
 * aparece em log: o Vercel avalia de cima para baixo e para na primeira que
 * casa. Se o catch-all `/(.*)` vier antes, ele engole tudo — o deploy fica
 * verde e o blog é servido pelo SPA.
 *
 * O que este teste faz é modelar a avaliação do Vercel para o subconjunto de
 * sintaxe que a configuração usa (`literal`, `:param*`, `(.*)`, grupo com
 * regex). **Não é o Vercel** — é um modelo. Ele prova a ordem e a cobertura,
 * que é onde o erro mora; não prova a semântica exata de cada padrão, e por
 * isso o AC4 continua exigindo preview deploy.
 *
 * Não usei `path-to-regexp` de propósito: a versão instalada é a 0.1.13 (a do
 * Express antigo) e o Vercel usa outra. Simular com ela produziria uma
 * resposta falsa — que é pior que não simular.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type Regra = { source: string; destination: string }

const config = JSON.parse(
  readFileSync(resolve(__dirname, "../../vercel.cutover.json"), "utf-8"),
) as {
  trailingSlash: boolean
  redirects: Array<Record<string, unknown>>
  rewrites: Regra[]
}

/** Converte um `source` do Vercel em regex, para o subconjunto que usamos. */
function paraRegex(source: string): RegExp {
  let padrao = source
    // Grupo nomeado com regex própria: `/:mapa(.*-sitemap\d*\.xml)`
    .replace(/\/:([A-Za-z_]\w*)\(([^)]+)\)/g, "/(?<$1>$2)")
    // Curinga de segmentos: `/:path*` casa zero ou mais segmentos.
    .replace(/\/:([A-Za-z_]\w*)\*/g, "(?:/(?<$1>.*))?")
    // Parâmetro simples.
    .replace(/\/:([A-Za-z_]\w*)/g, "/(?<$1>[^/]+)")

  return new RegExp(`^${padrao}$`)
}

/** Qual regra o Vercel usaria: a primeira que casa, de cima para baixo. */
function resolver(caminho: string): Regra | undefined {
  return config.rewrites.find((regra) => paraRegex(regra.source).test(caminho))
}

const CATCH_ALL = "/(.*)"

describe("ordem das regras", () => {
  it("o catch-all é a última regra", () => {
    const ultima = config.rewrites.at(-1)
    expect(ultima?.source).toBe(CATCH_ALL)
  })

  it("nenhuma regra vem depois do catch-all", () => {
    // Redundante com o teste acima por construção, mas é a afirmação que
    // importa: regra abaixo do catch-all é código morto silencioso.
    const posicao = config.rewrites.findIndex((r) => r.source === CATCH_ALL)
    expect(posicao).toBe(config.rewrites.length - 1)
  })

  it("a regra da API vem antes de tudo", () => {
    expect(config.rewrites[0]?.source).toBe("/api/:path*")
  })

  it("a regra dedicada de /blog vem antes da de /blog/:path*", () => {
    // AC3. `/blog/:path*` com `:path*` casando vazio cobriria `/blog`, mas
    // depender disso é depender de um detalhe do matcher.
    const dedicada = config.rewrites.findIndex((r) => r.source === "/blog")
    const geral = config.rewrites.findIndex((r) => r.source === "/blog/:path*")

    expect(dedicada).toBeGreaterThanOrEqual(0)
    expect(dedicada).toBeLessThan(geral)
  })
})

describe("nenhuma requisição de API ou de blog alcança o catch-all", () => {
  // AC5. Cada um destes caminhos, se caísse no catch-all, seria servido pelo
  // `index.html` do SPA — com status 200.
  const CAMINHOS = [
    "/api/blog/posts/oi/comments/",
    "/api/csrf/",
    "/blog",
    "/blog/oracao-da-manha",
    "/blog/page/2",
    "/blog/wp/wp-admin/",
    "/blog/wp-json/wp/v2/posts",
    "/sitemap.xml",
    "/post-sitemap.xml",
    "/post-sitemap2.xml",
    "/robots.txt",
  ]

  it.each(CAMINHOS)("%s não cai no catch-all", (caminho) => {
    const regra = resolver(caminho)

    expect(regra, `${caminho} não casou regra nenhuma`).toBeDefined()
    expect(regra?.source).not.toBe(CATCH_ALL)
  })

  it("o SPA continua sendo servido para o resto", () => {
    for (const caminho of ["/", "/fazer-pedido", "/conta", "/privacidade"]) {
      expect(resolver(caminho)?.source).toBe(CATCH_ALL)
    }
  })
})

describe("destinos", () => {
  it("/blog sem sufixo vai para a raiz da origem", () => {
    const regra = config.rewrites.find((r) => r.source === "/blog")
    expect(regra?.destination).toMatch(/\/$/)
  })

  it("o sitemap aponta para sitemap_index.xml, não para wp-sitemap.xml", () => {
    // Medido na Story 5.3: com Rank Math o índice é `sitemap_index.xml`, e
    // `wp-sitemap.xml` responde 301. Apontar para o caminho do core daria um
    // salto extra em cada requisição do Google.
    const regra = config.rewrites.find((r) => r.source === "/sitemap.xml")

    expect(regra?.destination).toContain("/sitemap_index.xml")
    expect(regra?.destination).not.toContain("wp-sitemap")
  })

  it("a chave do IndexNow é literal, não um padrão genérico", () => {
    // Um padrão como `/:chave(.*\\.txt)` mapearia qualquer .txt da raiz para
    // a origem — superfície desnecessária.
    const regra = config.rewrites.find((r) => r.source.endsWith(".txt"))

    expect(regra).toBeDefined()
    expect(regra?.source).not.toContain(":")
    expect(regra?.source).not.toContain("(")
  })
})

describe("redirects", () => {
  it("a paginação está em redirects, não em rewrites", () => {
    // AC1. Em rewrites, duas URLs serviriam o mesmo conteúdo — conteúdo
    // duplicado, que é o que a topologia de subdiretório existe para evitar.
    expect(config.redirects).toHaveLength(1)

    const regra = config.redirects[0] as Record<string, unknown>
    expect(regra.source).toBe("/blog")
    expect(regra.permanent).toBe(true)
    expect(JSON.stringify(regra.has)).toContain("page")

    const temPaginacaoEmRewrites = config.rewrites.some((r) =>
      r.source.includes("page"),
    )
    expect(temPaginacaoEmRewrites).toBe(false)
  })
})

describe("trailingSlash", () => {
  it("está alinhado ao permalink do WordPress", () => {
    // Story 5.2: o WordPress ficou com `/%postname%` sem barra e 301a a forma
    // com barra. Divergir aqui faria toda URL indexada receber 301.
    expect(config.trailingSlash).toBe(false)
  })
})

describe("o arquivo é alvo, não configuração ativa", () => {
  it("traz os marcadores que impedem ativação acidental", () => {
    const bruto = readFileSync(
      resolve(__dirname, "../../vercel.cutover.json"),
      "utf-8",
    )

    // Se alguém copiar isto sobre o vercel.json sem substituir, o blog aponta
    // para um host inexistente — e é melhor que quebre óbvio do que sutil.
    expect(bruto).toContain("ORIGEM_WORDPRESS")
    expect(bruto).toContain("CHAVE_INDEXNOW")
    expect(bruto).toContain("NÃO é o vercel.json ativo")
  })

  it("o vercel.json ativo ainda não aponta para o WordPress", () => {
    const ativo = JSON.parse(
      readFileSync(resolve(__dirname, "../../vercel.json"), "utf-8"),
    ) as { rewrites: Regra[] }

    const apontaParaOrigem = ativo.rewrites.some((r) =>
      r.destination.includes("ORIGEM_WORDPRESS"),
    )
    expect(apontaParaOrigem).toBe(false)
  })
})
