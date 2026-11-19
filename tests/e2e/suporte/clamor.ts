import { expect, type Page } from "@playwright/test"

/** O widget real do Turnstile vem da Cloudflare; aqui ele não carrega e o fallback de dev (só DEV) preenche o token. */
export async function semCloudflare(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }))
}

/**
 * Home: tema (opcional), texto e aceite da política; "Continuar" tria (a Claude simulada responde SEM_RISCO) e leva
 * à /entrega.
 */
export async function clamar(page: Page, texto: string, tema?: string) {
  await semCloudflare(page)
  await page.goto("/")
  if (tema) {
    await page.getByRole("button", { name: tema, exact: true }).click()
    await expect(page.getByRole("button", { name: tema, exact: true })).toHaveAttribute("aria-pressed", "true")
  }
  await page.getByLabel("O que pesa no seu coração hoje?").fill(texto)
  await page.locator("#consent").check()
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page).toHaveURL(/\/entrega$/)
}

/**
 * Entrega: quem é a pessoa (o logado já vem com nome e e-mail; aqui sobrescreve). Espera o fallback DEV do Turnstile,
 * que preenche o token 1,5 s depois de a /entrega abrir (o widget não dá sinal no DOM).
 */
export async function identificar(page: Page, p: { nome?: string; email?: string; cpf: string }) {
  await page.waitForTimeout(1600)
  if (p.nome) await page.getByLabel("Nome completo").fill(p.nome)
  if (p.email) await page.getByLabel("E-mail").fill(p.email)
  await page.getByLabel("CPF ou CNPJ").fill(p.cpf)
}

/** Entrega: oferta (rótulo do cartão, ex. "R$ 25" ou "Livre") e, no pago, a instituição. */
export async function contribuir(page: Page, oferta: string, instituicao?: string, livre?: string) {
  await page.getByRole("radiogroup", { name: "Escolha sua contribuição" }).getByRole("radio", { name: oferta }).click()
  if (livre) await page.getByLabel(/Valor da contribuição/).fill(livre)
  if (instituicao) {
    await page.getByRole("radiogroup", { name: "Instituição parceira" }).getByRole("radio", { name: instituicao }).click()
  }
}
