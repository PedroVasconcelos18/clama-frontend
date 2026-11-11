import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"

/**
 * Freemium (oração gratuita sem conta) contra o backend REAL, com a Claude simulada por WireMock; e-mail só no log da API.
 * Rodar: `MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/freemium.spec.ts`.
 *
 * Os links vêm do log da API (perfil local sem RESEND_API_KEY): "E-mail local para <destino>: <assunto>\n<texto>".
 * O ponto crítico é a ordem: nenhum "defina sua senha" antes da confirmação do e-mail.
 */

const SENHA = "Senha-de-teste-123"
const NOVA_SENHA = "Outra-senha-forte-456"
const SUPER = "super@clama.test"
const PESSOA = { nome: "Maria Gratuita", email: "gratis.e2e@clama.test", cpf: "52998224725" }
const OUTRA = { nome: "Outra Pessoa", email: "outra.e2e@clama.test" } // mesmo CPF da PESSOA
const ORACAO_PADRAO = "Senhor, guarda esta família com o Teu cuidado. Amém."

test.describe.configure({ mode: "serial" })

let linkDeConfirmacao = ""

/** Os e-mails que a API "enviou" para o destino, em ordem (cada um começa em "E-mail local para "). */
function emailsPara(destino: string): string[] {
  const log = readFileSync(process.env.API_LOG!, "utf8")
  return log.split(/(?=E-mail local para )/).filter((b) => b.startsWith(`E-mail local para ${destino}:`))
}

function linkNosEmails(destino: string, caminho: string): string | null {
  for (const e of emailsPara(destino)) {
    const m = e.match(new RegExp(`(http\\S*${caminho}\\?token=[\\w-]+)`))
    if (m) return m[1]
  }
  return null
}

// O FormControl do projeto é um <div>: o rótulo não aponta para o campo, então vai pelo name.
const campo = (page: Page, name: string) => page.locator(`#fazer-pedido [name="${name}"]`)

/** O widget real do Turnstile vem da Cloudflare; aqui ele não carrega e o fallback de dev preenche o token. */
async function semCloudflare(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }))
}

/** Landing anônima, card Gratuito, formulário SEM telefone. */
async function pedirGratis(page: Page, pessoa: { nome: string; email: string }) {
  await semCloudflare(page)
  await page.goto("/")
  await page.getByRole("radio", { name: /Gratuito/ }).click()
  await campo(page, "nome").fill(pessoa.nome)
  await campo(page, "email").fill(pessoa.email)
  await campo(page, "cpf_cnpj").fill(PESSOA.cpf)
  await campo(page, "idade").fill("40")
  await campo(page, "sexo").selectOption("feminino")
  await page.locator("#consent_aceito_gratuito").check()
  await expect(campo(page, "turnstile_token")).not.toHaveValue("")
  await expect(page.getByText("Telefone (opcional)")).toBeVisible()
  const resposta = page.waitForResponse((r) => r.url().endsWith("/api/freemium/pedidos") && r.request().method() === "POST")
  await page.getByRole("button", { name: "Receber minha oração gratuita" }).click()
  return resposta
}

test("1 e 2: pedido gratuito sem telefone mostra 'Confira seu e-mail' e a API não manda 'definir senha' antes da confirmação", async ({ page }) => {
  const resposta = await pedirGratis(page, PESSOA)
  expect((await resposta).status()).toBe(201)
  expect(JSON.parse((await resposta).request().postData()!)).not.toHaveProperty("deviceHash")
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible()

  // o e-mail de confirmação sai pelo job; só depois dele faz sentido afirmar a ausência do outro
  await expect.poll(() => linkNosEmails(PESSOA.email, "/confirmar"), { timeout: 20_000 }).not.toBeNull()
  linkDeConfirmacao = linkNosEmails(PESSOA.email, "/confirmar")!
  await page.waitForTimeout(1500)
  expect(emailsPara(PESSOA.email)).toHaveLength(1)
  expect(linkNosEmails(PESSOA.email, "/definir-senha")).toBeNull()
  expect(readFileSync(process.env.API_LOG!, "utf8")).not.toContain("/definir-senha")
})

test("3: o link do e-mail tira o token da URL, confirma, e a oração chega (ENVIADA)", async ({ page }) => {
  await page.goto(linkDeConfirmacao)
  await expect.poll(() => new URL(page.url()).searchParams.has("token")).toBe(false)
  await page.getByRole("button", { name: "Confirmar minha oração" }).click()
  await expect(page).toHaveURL(/\/confirmado\?pedido_id=[0-9a-f-]{36}$/)
  await expect(page.getByText(/dois e-mails/)).toContainText("defina sua senha")
  await page.getByRole("link", { name: "Acompanhar minha oração" }).click()
  await expect(page).toHaveURL(/\/confirmacao\?pedido_id=/)
  await expect(page.getByRole("heading", { name: "Sua oração já está aí!" })).toBeVisible({ timeout: 40_000 })
  await expect(page.getByText(ORACAO_PADRAO)).toBeVisible()
})

test("4: só agora existe o link 'definir senha'; ele cria a senha e o login funciona", async ({ page }) => {
  await expect.poll(() => linkNosEmails(PESSOA.email, "/definir-senha"), { timeout: 20_000 }).not.toBeNull()
  await page.goto(linkNosEmails(PESSOA.email, "/definir-senha")!)
  await expect.poll(() => new URL(page.url()).searchParams.has("token")).toBe(false)
  await page.getByLabel("Nova senha", { exact: true }).fill(NOVA_SENHA)
  await page.getByLabel("Confirmar nova senha").fill(NOVA_SENHA)
  await page.getByRole("button", { name: "Definir senha" }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel("E-mail").fill(PESSOA.email)
  await page.getByLabel("Senha", { exact: true }).fill(NOVA_SENHA)
  const entrar = page.getByRole("button", { name: "Entrar" })
  await expect(entrar).toBeEnabled()
  await entrar.click()
  await expect(page).toHaveURL(/\/conta$/)
})

test("5: o mesmo e-mail de novo vai ao /login com a mensagem e o 'Esqueci minha senha' em destaque", async ({ page }) => {
  const resposta = await pedirGratis(page, PESSOA)
  expect((await resposta).status()).toBe(409)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Você já tem conta com a gente. Faça login pra fazer um novo pedido.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Esqueci minha senha" })).toHaveClass(/bg-clama-gold/)
})

test("6: outro e-mail com o mesmo CPF recebe o 409", async ({ page }) => {
  const resposta = await pedirGratis(page, OUTRA)
  expect((await resposta).status()).toBe(409)
  expect((await (await resposta).json()).codigo).toBe("conta_existente")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(/Você já tem conta com a gente/)).toBeVisible()
})

test("7: o mesmo link de confirmação de novo mostra 'Esse link não é mais válido'", async ({ page }) => {
  await page.goto(linkDeConfirmacao)
  await page.getByRole("button", { name: "Confirmar minha oração" }).click()
  await expect(page.getByText(/Esse link não é mais válido/)).toBeVisible()
  await expect(page).toHaveURL(/\/confirmar$/)
})

test("8: o admin acha o bloqueio pelo e-mail e desbloqueia", async ({ page }) => {
  await page.goto("/admin/login")
  const botao = page.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled()
  await page.getByLabel("E-mail").fill(SUPER)
  await page.getByLabel("Senha", { exact: true }).fill(SENHA)
  await botao.click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto("/admin/freemium")
  await expect(page.getByRole("heading", { name: "Bloqueio do freemium" })).toBeVisible()
  await expect(page.getByText(/Todos os bloqueios \(1\)/)).toBeVisible()

  // e-mail e CPF só no corpo do POST: o hash do e-mail aparece, o e-mail em claro não
  await page.getByLabel("E-mail").fill(PESSOA.email)
  await page.getByRole("button", { name: "Buscar bloqueio" }).click()
  const achado = page.getByRole("region").or(page.locator("section")).filter({ hasText: "Resultado da busca" })
  await expect(achado.getByRole("row")).toHaveCount(2) // cabeçalho + 1
  await expect(page.locator("body")).not.toContainText(PESSOA.email) // o texto da página nunca traz o e-mail em claro
  await achado.getByRole("button", { name: "Desbloquear" }).click()
  await expect(page.getByText("Desbloquear freemium?")).toBeVisible()
  await page.getByRole("button", { name: "Confirmar desbloqueio" }).click()
  await expect(page.getByText("Bloqueio removido.")).toBeVisible()
  await expect(page.getByText(/Todos os bloqueios \(0\)/)).toBeVisible()

  await page.getByRole("button", { name: "Buscar bloqueio" }).click()
  await expect(page.getByText("Nenhum bloqueio encontrado para esses dados.")).toBeVisible()
})
