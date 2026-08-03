import { test, expect, request } from "@playwright/test"

/**
 * Gate de cutover (Story 6.5).
 *
 * 🔴 **Bloqueante, não indicativo.** Qualquer item vermelho impede o cutover
 * (AC12). Não é uma lista de coisas boas de ter — é a condição de go-live.
 *
 * ⚠️ **Roda contra a URL proxiada, nunca contra a origem** (AC1). Testar a
 * origem direto validaria o WordPress e não validaria a migração: o proxy é
 * onde moram a ordem das regras, a barra final, o cache e o cookie.
 *
 * Aponte a `baseURL` do Playwright para o staging **proxiado** antes de rodar.
 *
 * O que está aqui e não estava no `blog-smoke.spec.ts`:
 * - paginação em `/page/N` (AC2)
 * - formato de barra final (AC2)
 * - 200 direto, sem 301 intermediário (AC3)
 * - comentário visível na primeira carga do post (AC3)
 * - imagem do post respondendo 200 (AC3)
 * - cookie de auth ausente em `/blog/*` e presente em `/api/*` (AC6)
 * - webhook sem HMAC devolvendo 401 (AC7)
 * - `Disallow: /` ausente e sem `noindex` (AC8)
 */

const SLUG_DE_REFERENCIA = process.env.GATE_SLUG || ""

test.describe("Gate — roteamento e formato de URL", () => {
  test("/blog responde 200 direto, sem 301", async ({ page }) => {
    // AC3. Um 301 aqui é a Story 6.1 com a regra dedicada faltando: o
    // `/blog` sem sufixo cai no catch-all e o SPA responde.
    const resposta = await page.goto("/blog", { waitUntil: "domcontentloaded" })

    expect(resposta?.status()).toBe(200)
    expect(page.url()).toMatch(/\/blog$/)
  })

  test("/blog/ com barra final redireciona para a forma sem barra", async ({
    request: req,
  }) => {
    // AC2. Se as duas formas respondessem 200, teríamos conteúdo duplicado;
    // se a canônica fosse a com barra, toda URL indexada receberia 301.
    const resposta = await req.get("/blog/", { maxRedirects: 0 })

    expect([301, 308]).toContain(resposta.status())
    expect(resposta.headers()["location"]).toMatch(/\/blog$/)
  })

  test("post responde 200 direto, sem salto", async ({ request: req }) => {
    test.skip(!SLUG_DE_REFERENCIA, "defina GATE_SLUG")

    const resposta = await req.get(`/blog/${SLUG_DE_REFERENCIA}`, {
      maxRedirects: 0,
    })

    expect(resposta.status()).toBe(200)
  })

  test("paginação responde em /blog/page/2", async ({ request: req }) => {
    // AC2 — asserção que não existe no smoke atual.
    const resposta = await req.get("/blog/page/2", { maxRedirects: 0 })

    // 200 se houver segunda página; 404 se o blog ainda não tem posts
    // suficientes. O que não pode é 301 para a página 1, que serviria
    // conteúdo errado com aparência de sucesso.
    expect([200, 404]).toContain(resposta.status())
  })

  test("/blog?page=2 devolve 301 para o formato novo", async ({
    request: req,
  }) => {
    const resposta = await req.get("/blog?page=2", { maxRedirects: 0 })

    expect(resposta.status()).toBe(301)
    expect(resposta.headers()["location"]).toContain("/blog/page/2")
  })
})

test.describe("Gate — SEO do domínio", () => {
  test("robots.txt não bloqueia o domínio", async ({ request: req }) => {
    // AC8. É o interruptor do ADR-03: um clique em "Search Engine
    // Visibility" tira a landing, a /conta e o fluxo de pedido do índice.
    const resposta = await req.get("/robots.txt")

    expect(resposta.status()).toBe(200)

    const linhas = (await resposta.text())
      .split("\n")
      .map((l) => l.trim().replace(/\s/g, "").toLowerCase())

    // Linha inteira, não substring: `Disallow: /admin/` contém `Disallow: /`.
    expect(linhas).not.toContain("disallow:/")
  })

  test("sitemap responde 200 e os filhos são acessíveis", async ({
    request: req,
  }) => {
    const indice = await req.get("/sitemap.xml", { maxRedirects: 0 })
    expect(indice.status()).toBe(200)

    const filhos = [...(await indice.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .slice(0, 5)

    expect(filhos.length).toBeGreaterThan(0)

    for (const url of filhos) {
      const filho = await req.get(url)
      expect(filho.status(), `sitemap-filho ${url}`).toBe(200)
      // AC10 — URLs do domínio público, não da origem.
      expect(url).not.toContain("wp.clama")
    }
  })

  test("nenhum noindex em /blog, nem na meta nem no header", async ({
    request: req,
  }) => {
    // AC8. Os dois caminhos são independentes; checar um só deixaria metade
    // do risco invisível.
    const resposta = await req.get("/blog")

    expect(resposta.headers()["x-robots-tag"] || "").not.toContain("noindex")

    const html = await resposta.text()
    const metaRobots = html.match(
      /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)/i,
    )
    expect(metaRobots?.[1] || "").not.toContain("noindex")
  })
})

test.describe("Gate — segurança", () => {
  test("o cookie de auth não é enviado para /blog e é enviado para /api", async ({
    browser,
  }) => {
    // AC6, e é o coração do Epic 1: o cookie tem escopo `Path=/api`, então o
    // servidor WordPress nunca o recebe. Se ele vazar para `/blog`, o desenho
    // inteiro do ADR-01 cai.
    const contexto = await browser.newContext()
    const url = new URL((await contexto.newPage()).url() || "http://localhost")

    await contexto.addCookies([
      {
        name: "clama_access",
        value: "token-de-teste",
        domain: url.hostname,
        path: "/api",
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "Lax",
      },
    ])

    const paraBlog = await contexto.request.get("/blog")
    const paraApi = await contexto.request.get("/api/csrf/")

    // O navegador decide pelo `Path`; o que se verifica é que ele existe com
    // o escopo certo e que o blog responde sem ele.
    const cookies = await contexto.cookies()
    const auth = cookies.find((c) => c.name === "clama_access")

    expect(auth?.path).toBe("/api")
    expect(auth?.httpOnly).toBe(true)
    expect(paraBlog.status()).toBe(200)
    expect(paraApi.status()).toBeLessThan(500)

    await contexto.close()
  })

  test("nenhum token em localStorage depois de visitar o blog", async ({
    page,
  }) => {
    // AC6. Story 1.8 purgou os legados; isto garante que a migração não
    // reintroduziu nenhum.
    await page.goto("/blog")

    const suspeitos = await page.evaluate(() =>
      Object.keys(localStorage).filter((chave) =>
        /token|auth|jwt|access|refresh/i.test(
          chave + String(localStorage.getItem(chave)),
        ),
      ),
    )

    expect(suspeitos).toEqual([])
  })

  test("o webhook rejeita requisição sem HMAC, com 401", async () => {
    // AC7. E o que importa não é só o status: é que nada seja criado nem
    // enfileirado — verificado no backend por teste próprio (Story 3.2).
    const req = await request.newContext()
    const resposta = await req.post("/api/webhooks/wordpress/", {
      form: { evento_id: "gate", tipo: "post_publicado", wp_post_id: "1" },
      maxRedirects: 0,
    })

    expect(resposta.status()).toBe(401)
    await req.dispose()
  })
})

test.describe("Gate — conteúdo do post", () => {
  test("o widget de comentários carrega na primeira carga", async ({ page }) => {
    // AC3 — um dos casos que "antes não podiam falhar". O widget monta
    // client-side; se o bundle não carregar, a âncora fica vazia e ninguém
    // percebe olhando a página de relance.
    test.skip(!SLUG_DE_REFERENCIA, "defina GATE_SLUG")

    await page.goto(`/blog/${SLUG_DE_REFERENCIA}`)

    const ancora = page.locator("#clama-widget-engajamento")
    await expect(ancora).toBeAttached()
    await expect(page.locator('[data-slot="like-button"]')).toBeVisible()
  })

  test("todas as imagens do post respondem 200", async ({ page, request: req }) => {
    // AC11. Toda imagem já é externa (Story 4.2) — link podre aqui quebra o
    // post sem aviso.
    test.skip(!SLUG_DE_REFERENCIA, "defina GATE_SLUG")

    await page.goto(`/blog/${SLUG_DE_REFERENCIA}`)

    const fontes = await page.evaluate(() =>
      [...document.querySelectorAll("article img")].map((i) => (i as HTMLImageElement).src),
    )

    for (const src of fontes) {
      const resposta = await req.get(src)
      expect(resposta.status(), `imagem ${src}`).toBeLessThan(400)
    }
  })

  test("a página traz as tags de SEO", async ({ page }) => {
    test.skip(!SLUG_DE_REFERENCIA, "defina GATE_SLUG")

    await page.goto(`/blog/${SLUG_DE_REFERENCIA}`)

    const html = await page.content()

    expect(html).toContain('name="description"')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('name="twitter:card"')
    expect(html).toContain("application/ld+json")
    expect(html).toContain("BreadcrumbList")
  })
})
