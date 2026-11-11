import { test, expect, type Browser, type Page } from "@playwright/test"

/**
 * Catálogo (planos e instituições) contra o backend REAL (clama-api, perfil local, Postgres em container).
 * Rodar: `tests/e2e/suporte/rodar-conta.sh tests/e2e/catalogo.spec.ts`.
 *
 * As listas públicas têm Cache-Control de 60 s: cada conferência da landing usa um contexto novo (cache vazio).
 */

const SENHA = "Senha-de-teste-123"
const SUPER = "super@clama.test"
// PNG 1x1 válido (confere pelos bytes no backend)
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

test.describe.configure({ mode: "serial" })

let admin: Page

test.beforeAll(async ({ browser }) => {
  admin = await (await browser.newContext()).newPage()
  await admin.goto("/admin/login")
  const entrar = admin.getByRole("button", { name: "Entrar" })
  await expect(entrar).toBeEnabled()
  await admin.getByLabel("E-mail").fill(SUPER)
  await admin.getByLabel("Senha", { exact: true }).fill(SENHA)
  await entrar.click()
  await expect(admin).toHaveURL(/\/admin$/)
})

test.afterAll(async () => {
  await admin.context().close()
})

async function landing(browser: Browser) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto("/")
  return { page, fechar: () => ctx.close() }
}

async function abrirSelectDeInstituicao(page: Page) {
  const trigger = page.locator("#instituicao")
  await trigger.scrollIntoViewIfNeeded()
  await expect(trigger).toBeEnabled()
  await trigger.click()
}

async function criarInstituicao(nome: string, logo?: { name: string; mimeType: string; buffer: Buffer }) {
  await admin.goto("/admin/instituicoes")
  await admin.getByRole("button", { name: /Nova Instituição/ }).click()
  await admin.getByLabel("Nome").fill(nome)
  if (logo) await admin.getByLabel("Logo").setInputFiles(logo)
  await admin.getByRole("button", { name: "Salvar" }).click()
}

const cartao = (page: Page, nome: string) => page.getByRole("heading", { name: nome }).locator("xpath=ancestor::div[contains(@class,'border')][1]")

test("sem sessão, /admin/planos leva ao login", async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto("/admin/planos")
  await expect(page).toHaveURL(/\/admin\/login/)
  await ctx.close()
})

test("admin cria um plano e ele aparece na landing", async ({ browser }) => {
  await admin.goto("/admin/planos")
  await admin.getByRole("button", { name: /Novo Plano/ }).click()
  await admin.getByLabel("Nome").fill("Plano E2E")
  await admin.getByLabel("Valor (R$)").fill("12,34")
  await admin.getByLabel("Descrição").fill("Criado pelo teste")
  await admin.getByRole("button", { name: "Salvar" }).click()
  await expect(admin.getByRole("heading", { name: "Plano E2E" })).toBeVisible()
  await expect(cartao(admin, "Plano E2E").getByText("R$ 12,34")).toBeVisible()

  const { page, fechar } = await landing(browser)
  await expect(page.getByRole("radio", { name: /Plano E2E|R\$\s*12,34/ })).toBeVisible()
  await expect(page.getByText("Criado pelo teste")).toBeVisible()
  await fechar()
})

test("edita a descrição do plano gratuito, que só tem nome e descrição editáveis", async () => {
  await admin.goto("/admin/planos")
  const gratuito = cartao(admin, "Gratuito")
  await expect(gratuito.getByText("Do sistema")).toBeVisible()
  await expect(gratuito.getByRole("button", { name: "Desativar" })).toHaveCount(0)
  await gratuito.getByRole("button", { name: "Editar" }).click()
  await expect(admin.getByLabel("Valor (R$)")).toBeDisabled()
  await expect(admin.getByLabel("Ordem")).toBeDisabled()
  await admin.getByLabel("Descrição").fill("Descrição nova do gratuito")
  await admin.getByRole("button", { name: "Salvar" }).click()
  await expect(admin.getByText("Descrição nova do gratuito")).toBeVisible()
  await admin.reload()
  await expect(cartao(admin, "Gratuito").getByText("Descrição nova do gratuito")).toBeVisible()
})

test("instituição com logo PNG aparece no select da landing, com a imagem carregada", async ({ browser }) => {
  await criarInstituicao("Casa E2E", { name: "logo.png", mimeType: "image/png", buffer: PNG })
  await expect(admin.getByRole("heading", { name: "Casa E2E" })).toBeVisible()

  const { page, fechar } = await landing(browser)
  await abrirSelectDeInstituicao(page)
  const opcao = page.getByRole("option", { name: /Casa E2E/ })
  await expect(opcao).toBeVisible()
  const img = opcao.locator("img")
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true)
  await expect(img).toHaveAttribute("src", /\/api\/instituicoes\/\d+\/logo\?v=/)
  await fechar()
})

test("desativar some da landing e reativar volta", async ({ browser }) => {
  await admin.goto("/admin/instituicoes")
  await cartao(admin, "Casa E2E").getByRole("button", { name: "Desativar" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Desativar" }).click()
  await expect(cartao(admin, "Casa E2E").getByText("Inativo")).toBeVisible()

  let l = await landing(browser)
  await abrirSelectDeInstituicao(l.page)
  await expect(l.page.getByRole("option", { name: "Sem instituição" })).toBeVisible()
  await expect(l.page.getByRole("option", { name: /Casa E2E/ })).toHaveCount(0)
  await l.fechar()

  await cartao(admin, "Casa E2E").getByRole("button", { name: "Ativar" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Ativar" }).click()
  await expect(cartao(admin, "Casa E2E").getByText("Inativo")).toHaveCount(0)

  l = await landing(browser)
  await abrirSelectDeInstituicao(l.page)
  await expect(l.page.getByRole("option", { name: /Casa E2E/ })).toBeVisible()
  await l.fechar()
})

test("logo inválida (texto com extensão .png) mostra o erro do servidor", async () => {
  await criarInstituicao("Casa Falsa", { name: "falsa.png", mimeType: "image/png", buffer: Buffer.from("isto nao e uma imagem") })
  // a instituição foi gravada (passo 1), o diálogo fica aberto com o erro da logo (passo 2)
  const dialogo = admin.getByRole("dialog")
  const erro = dialogo.locator("p.text-red-400")
  await expect(erro).toHaveCount(1)
  await expect(erro).toHaveText("Formato de imagem não suportado. Use PNG, JPG, WEBP ou GIF.")
  await expect(dialogo.getByLabel("Nome")).toHaveValue("Casa Falsa")
  await admin.getByRole("button", { name: "Cancelar" }).click()
  await expect(admin.getByRole("heading", { name: "Casa Falsa" })).toBeVisible()
})

test("nome duplicado entre ativos aparece embaixo do campo nome", async () => {
  await criarInstituicao("Casa E2E")
  const dialogo = admin.getByRole("dialog")
  await expect(dialogo.locator("p.text-red-400")).toHaveCount(1)
  await expect(dialogo.locator("#nome ~ p.text-red-400")).toHaveText("Já existe uma instituição ativa com este nome.")
})
