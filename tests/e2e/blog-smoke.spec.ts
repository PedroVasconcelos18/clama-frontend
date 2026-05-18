import { test, expect } from "@playwright/test"

/**
 * Smoke tests do blog público — fluxos que precisam SEMPRE funcionar.
 * Backend pode estar offline durante o build (empty state OK), mas dev/preview
 * com backend rodando deve carregar dados reais.
 */

test.describe("Blog público — leitor anônimo", () => {
  test("/blog responde 200 e mostra título da listagem", async ({ page }) => {
    const response = await page.goto("/blog")
    expect(response?.status()).toBeLessThan(400)
    await expect(
      page.getByRole("heading", { name: /blog do clama/i }),
    ).toBeVisible()
  })

  test("/blog/teste responde 200 e renderiza conteúdo SSR", async ({
    page,
  }) => {
    const response = await page.goto("/blog/teste")
    expect(response?.status()).toBeLessThan(400)
    await expect(
      page.getByRole("heading", { name: /página de teste vike/i }),
    ).toBeVisible()
  })

  test("/blog tem links navegáveis pra header (Conta)", async ({ page }) => {
    await page.goto("/blog")
    const contaLink = page.getByRole("link", { name: /^conta$/i })
    await expect(contaLink).toHaveAttribute("href", "/conta")
  })

  test("/blog page tem grid responsivo ou empty state", async ({ page }) => {
    await page.goto("/blog")
    // Aceita 2 estados: lista de posts OU empty state
    const empty = page.getByText(
      /primeiros posts estão chegando|aparecer aqui em instantes/i,
    )
    const cards = page.getByRole("link", { name: /^ler post: /i })
    await expect(empty.or(cards.first())).toBeVisible()
  })
})

test.describe("SPA shell — leitor anônimo", () => {
  test("/ ainda funciona (Landing via react-router-dom)", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.status()).toBeLessThan(400)
    // Apenas confirma que página carrega — Landing tem conteúdo do clama MVP
    await expect(page.locator("body")).toBeVisible()
  })

  test("/login responde 200", async ({ page }) => {
    const response = await page.goto("/login")
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator("body")).toBeVisible()
  })

  test("/termos contém seção de comentários do blog (Story 6.1)", async ({
    page,
  }) => {
    await page.goto("/termos")
    await expect(
      page.getByRole("heading", { name: /comentários no blog/i }),
    ).toBeVisible()
  })

  test("/privacidade contém seção Dados do Blog (Story 6.2)", async ({
    page,
  }) => {
    await page.goto("/privacidade")
    await expect(
      page.getByRole("heading", { name: /dados do blog/i }),
    ).toBeVisible()
  })
})

test.describe("SEO — meta tags presentes no HTML inicial", () => {
  test("/blog/teste tem meta description no HTML inicial (sem JS)", async ({
    request,
  }) => {
    const response = await request.get("/blog/teste")
    expect(response.status()).toBeLessThan(400)
    const html = await response.text()
    expect(html).toMatch(/<meta[^>]+name="description"/)
    expect(html).toMatch(/<meta[^>]+property="og:title"/)
  })

  test("/blog tem <title> 'Blog | Clama'", async ({ request }) => {
    const response = await request.get("/blog")
    const html = await response.text()
    expect(html).toMatch(/<title>[^<]*Blog[^<]*Clama[^<]*<\/title>/i)
  })
})
