import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import { clamar, identificar } from "./suporte/clamor"

/**
 * Freemium (oração gratuita sem conta) contra o backend REAL, com a Claude simulada por WireMock; e-mail só no log da API.
 * Rodar: `MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/freemium.spec.ts`.
 *
 * Os links vêm do log da API (perfil local sem RESEND_API_KEY): "E-mail local para <destino>: <assunto>\n<texto>".
 * O ponto crítico é a ordem: nenhum "defina sua senha" antes da confirmação do e-mail. Confirmado o e-mail, a senha
 * é criada na própria tela da oração (decisão 2: a confirmação devolve o token de senha).
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
    const m = e.match(new RegExp(`(http\\S*${caminho}#token=[\\w-]+)`))
    if (m) return m[1]
  }
  return null
}

/** Home → clamor → entrega anônima, oferta Gratuito (o padrão), formulário sem idade, sexo nem telefone. */
async function pedirGratis(page: Page, pessoa: { nome: string; email: string }) {
  await clamar(page, "Pela minha família, que anda distante.", "Família")
  await identificar(page, { ...pessoa, cpf: PESSOA.cpf })
  await expect(page.getByRole("radio", { name: "Gratuito" })).toHaveAttribute("aria-checked", "true")
  await expect(page.locator('[name="telefone"], [name="idade"], [name="sexo"]')).toHaveCount(0)
  const resposta = page.waitForResponse((r) => r.url().endsWith("/api/freemium/pedidos") && r.request().method() === "POST")
  await page.getByRole("button", { name: "Enviar meu clamor" }).click()
  return resposta
}

test("1 e 2: pedido gratuito sem telefone mostra 'Confira seu e-mail' e a API não manda 'definir senha' antes da confirmação", async ({ page }) => {
  const resposta = await pedirGratis(page, PESSOA)
  expect((await resposta).status()).toBe(201)
  const corpo = JSON.parse((await resposta).request().postData()!)
  expect(corpo).not.toHaveProperty("deviceHash")
  expect(corpo).toMatchObject({ tema: "familia", consentAceito: true })
  await expect(page).toHaveURL(/\/confirmado$/) // o e-mail vai no state, nunca na URL
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible()
  await expect(page.getByText(PESSOA.email)).toBeVisible()

  // o e-mail de confirmação sai pelo job; só depois dele faz sentido afirmar a ausência do outro
  await expect.poll(() => linkNosEmails(PESSOA.email, "/confirmar"), { timeout: 20_000 }).not.toBeNull()
  linkDeConfirmacao = linkNosEmails(PESSOA.email, "/confirmar")!
  await page.waitForTimeout(1500)
  expect(emailsPara(PESSOA.email)).toHaveLength(1)
  expect(linkNosEmails(PESSOA.email, "/definir-senha")).toBeNull()
  expect(readFileSync(process.env.API_LOG!, "utf8")).not.toContain("/definir-senha")
})

test("3 e 4: o link tira o token da URL e confirma; a oração vem na tela, a senha nasce ali e o login funciona", async ({ page }) => {
  await page.goto(linkDeConfirmacao)
  await expect.poll(() => new URL(page.url()).hash.includes("token")).toBe(false)
  await page.getByRole("button", { name: "Confirmar minha oração" }).click()
  await expect(page).toHaveURL(/\/confirmacao\?pedido_id=[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name: "Sua oração já está aí!" })).toBeVisible({ timeout: 40_000 })
  await expect(page.getByText(ORACAO_PADRAO, { exact: true })).toBeVisible()
  await expect(page.getByText("Escrita com ajuda de IA a partir das suas palavras.")).toBeVisible()

  // a senha na hora, com o token da confirmação (vale mesmo depois de o e-mail da oração sair: decisão 3)
  await page.getByLabel("Crie uma senha").fill(NOVA_SENHA)
  await page.getByRole("button", { name: "Criar senha" }).click()
  const criada = page.getByText("Senha criada — agora é só entrar.")
  await expect(criada).toBeVisible()
  await criada.getByRole("link", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel("E-mail").fill(PESSOA.email)
  await page.getByLabel("Senha", { exact: true }).fill(NOVA_SENHA)
  const entrar = page.getByRole("button", { name: "Entrar" })
  await expect(entrar).toBeEnabled()
  await entrar.click()
  await expect(page).toHaveURL(/\/conta$/)
  await expect(page.getByRole("heading", { name: /Sua\s+jornada/ })).toBeVisible()
  await expect(page.getByText("Família", { exact: true })).toBeVisible()
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
