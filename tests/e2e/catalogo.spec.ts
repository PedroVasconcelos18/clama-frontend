import { test, expect, type Browser, type Page } from "@playwright/test"
import { clamar } from "./suporte/clamor"

/**
 * Catálogo (planos e instituições) contra o backend REAL (clama-api, perfil local, Postgres em container).
 * Rodar: `tests/e2e/suporte/rodar-conta.sh tests/e2e/catalogo.spec.ts`.
 *
 * As listas públicas têm Cache-Control de 60 s (as metas, 5 min): cada conferência da home usa um contexto novo
 * (cache vazio). Na v2 a home não lê mais os planos (os valores sugeridos são fixos no front) e mostra as instituições
 * em "Metas do mês", só leitura; a escolha da instituição acontece na /entrega.
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

/** O cartão da instituição em "Metas do mês" (home). */
const naHome = (page: Page, nome: string) => page.getByRole("listitem").filter({ hasText: nome })

async function criarInstituicao(
  nome: string,
  logo?: { name: string; mimeType: string; buffer: Buffer },
  meta?: { causa: string; metaMensal: string; custoUnidade: string; unidade: string },
) {
  await admin.goto("/admin/instituicoes")
  await admin.getByRole("button", { name: /Nova Instituição/ }).click()
  await admin.getByLabel("Nome").fill(nome)
  if (logo) await admin.getByLabel("Logo").setInputFiles(logo)
  if (meta) {
    await admin.getByLabel("Causa").fill(meta.causa)
    await admin.getByLabel("Meta mensal (R$)").fill(meta.metaMensal)
    await admin.getByLabel("Custo por unidade (R$)").fill(meta.custoUnidade)
    await admin.getByLabel("Unidade", { exact: true }).fill(meta.unidade)
  }
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

test("admin cria um plano (só relatório na v2: a home não mostra planos)", async ({ browser }) => {
  await admin.goto("/admin/planos")
  await admin.getByRole("button", { name: /Novo Plano/ }).click()
  await admin.getByLabel("Nome").fill("Plano E2E")
  await admin.getByLabel("Valor (R$)").fill("12,34")
  await admin.getByLabel("Descrição").fill("Criado pelo teste")
  await admin.getByRole("button", { name: "Salvar" }).click()
  await expect(admin.getByRole("heading", { name: "Plano E2E" })).toBeVisible()
  await expect(cartao(admin, "Plano E2E").getByText("R$ 12,34")).toBeVisible()

  const { page, fechar } = await landing(browser)
  await expect(page.getByRole("heading", { name: "Três passos, sem pressa" })).toBeVisible()
  await expect(page.getByText("Criado pelo teste")).toHaveCount(0)
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

test("instituição com logo PNG aparece em Metas do mês na home, com a imagem carregada e sem barra", async ({ browser }) => {
  await criarInstituicao("Casa E2E", { name: "logo.png", mimeType: "image/png", buffer: PNG })
  await expect(admin.getByRole("heading", { name: "Casa E2E" })).toBeVisible()

  const { page, fechar } = await landing(browser)
  const casa = naHome(page, "Casa E2E")
  await expect(casa).toBeVisible()
  const img = casa.locator("img")
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true)
  await expect(img).toHaveAttribute("src", /\/api\/instituicoes\/\d+\/logo\?v=/)
  await expect(casa.getByRole("progressbar")).toHaveCount(0) // sem meta, sem barra
  await fechar()
})

test("a instituição com meta mostra a barra na home e na entrega", async ({ browser }) => {
  await criarInstituicao("Casa com Meta", undefined, {
    causa: "Cestas básicas para famílias do bairro",
    metaMensal: "1.000,00",
    custoUnidade: "50,00",
    unidade: "cestas",
  })
  await expect(admin.getByRole("heading", { name: "Casa com Meta" })).toBeVisible()

  const { page, fechar } = await landing(browser)
  const casa = naHome(page, "Casa com Meta")
  await expect(casa).toContainText("Cestas básicas para famílias do bairro")
  await expect(casa.getByRole("progressbar", { name: "Meta de Casa com Meta: 0%" })).toBeVisible()
  await expect(casa).toContainText(/R\$\s*0,00 de R\$\s*1\.000,00/)
  await expect(casa).toContainText("0 de 20 cestas")

  // na entrega, o mesmo cartão vira a escolha da instituição, com o percentual que vem de /api/metas
  await clamar(page, "Pelas famílias do bairro.")
  await page.getByRole("radiogroup", { name: "Escolha sua contribuição" }).getByRole("radio", { name: "R$ 12" }).click()
  await expect(page.getByText(/^\d+% da sua contribuição vai para a instituição/)).toBeVisible()
  const escolha = page.getByRole("radiogroup", { name: "Instituição parceira" }).getByRole("radio", { name: /Casa com Meta/ })
  await expect(escolha.getByRole("progressbar")).toBeVisible()
  await fechar()
})

test("desativar some da home e reativar volta", async ({ browser }) => {
  await admin.goto("/admin/instituicoes")
  await cartao(admin, "Casa E2E").getByRole("button", { name: "Desativar" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Desativar" }).click()
  await expect(cartao(admin, "Casa E2E").getByText("Inativo")).toBeVisible()

  let l = await landing(browser)
  await expect(naHome(l.page, "Casa com Meta")).toBeVisible()
  await expect(naHome(l.page, "Casa E2E")).toHaveCount(0)
  await l.fechar()

  await cartao(admin, "Casa E2E").getByRole("button", { name: "Ativar" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Ativar" }).click()
  await expect(cartao(admin, "Casa E2E").getByText("Inativo")).toHaveCount(0)

  l = await landing(browser)
  await expect(naHome(l.page, "Casa E2E")).toBeVisible()
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
