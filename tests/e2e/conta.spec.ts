import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import { clamar, contribuir, identificar } from "./suporte/clamor"

/**
 * Conta e usuários contra o backend REAL (clama-api, perfil local, Postgres em container).
 * Rodar: `tests/e2e/suporte/rodar-conta.sh` (sobe tudo em portas livres, semeia e derruba no fim).
 *
 * O link do "esqueci a senha" vem do log da API: no perfil local sem RESEND_API_KEY o e-mail sai em INFO.
 * O limite de login é 5 por e-mail em 15 min: cada usuário semeado entra poucas vezes aqui.
 */

const SENHA = "Senha-de-teste-123"
const NOVA_SENHA = "Outra-senha-forte-456"
const SUPER = "super@clama.test"
const SUPER2 = "super2@clama.test" // login tem limite de 5 por e-mail: o segundo superusuário alivia o primeiro
const CLIENTE = "cliente@clama.test"
const ESQUECI = "esqueci@clama.test"

test.describe.configure({ mode: "serial" })

/** Entra e espera o painel (para quem é admin), antes de qualquer `goto` que cortaria o login no meio. */
async function entrarNoPainel(page: Page, rota: string, email: string) {
  await entrar(page, rota, email)
  await expect(page).toHaveURL(/\/admin$/)
}

async function entrar(page: Page, rota: string, email: string, senha = SENHA) {
  await page.goto(rota)
  const botao = page.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled() // habilita quando a sessão do boot carregou
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill(senha)
  await botao.click()
}

function linkDoEmail(para: string, caminho = "/redefinir-senha"): string | null {
  const log = readFileSync(process.env.API_LOG!, "utf8")
  const m = log.match(new RegExp(`E-mail local para ${para}[\\s\\S]*?(http\\S*${caminho}#token=[\\w-]+)`))
  return m ? m[1] : null
}

test("login de cliente cai em /conta", async ({ page }) => {
  await entrar(page, "/login", CLIENTE)
  await expect(page).toHaveURL(/\/conta$/)
  await expect(page.getByText(/Olá, Cliente/).first()).toBeVisible()
})

test("login de admin em /admin/login cai no painel", async ({ page }) => {
  await entrar(page, "/admin/login", SUPER)
  await expect(page).toHaveURL(/\/admin$/)
})

test("admin pela tela de cliente vai para /admin", async ({ page }) => {
  await entrar(page, "/login", SUPER)
  await expect(page).toHaveURL(/\/admin$/)
})

test("cliente em /admin/login e recusado e fica sem sessão", async ({ page }) => {
  await entrar(page, "/admin/login", CLIENTE)
  await expect(page.getByText("Esse espaço é só para admins do Clama.")).toBeVisible()
  const eu = await page.request.get("/api/auth/eu")
  expect(eu.status()).toBe(401)
})

test("senha errada mostra a mensagem do servidor", async ({ page }) => {
  await entrar(page, "/login", CLIENTE, "senha-errada-xyz")
  await expect(page.getByText("Email ou senha inválidos.").first()).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test("esqueci a senha: link do e-mail, token sai da URL, nova senha entra", async ({ page }) => {
  await page.goto("/login")
  await page.getByText("Esqueci minha senha").click()
  await page.locator("#forgot-email").fill(ESQUECI)
  await page.getByRole("button", { name: "Enviar link" }).click()
  await expect(page.getByText(/link para escolher uma nova senha/)).toBeVisible()

  await expect.poll(() => linkDoEmail(ESQUECI), { timeout: 15_000 }).not.toBeNull()
  const link = linkDoEmail(ESQUECI)!

  await page.goto(link)
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer")
  await expect.poll(() => new URL(page.url()).searchParams.has("token")).toBe(false)
  await page.getByLabel("Nova senha", { exact: true }).fill(NOVA_SENHA)
  await page.getByLabel("Confirmar nova senha").fill(NOVA_SENHA)
  await page.getByRole("button", { name: "Redefinir senha" }).click()
  await expect(page).toHaveURL(/\/login$/)

  // o mesmo link não vale duas vezes
  const outra = await page.request.post("/api/auth/redefinicao-de-senha", {
    data: { token: new URL(link).searchParams.get("token"), novaSenha: "Mais-uma-senha-789" },
    headers: { "X-XSRF-TOKEN": (await page.context().cookies()).find((c) => c.name === "XSRF-TOKEN")?.value ?? "" },
  })
  expect(outra.status()).toBe(400)

  await entrar(page, "/login", ESQUECI, NOVA_SENHA)
  await expect(page).toHaveURL(/\/conta$/)
})

test("criar conta: link de definir senha no e-mail, entrar e o clamor aparece em Sua jornada", async ({ page }) => {
  const email = `nova-${Date.now()}@clama.test`
  await page.goto("/login")
  await page.getByRole("tab", { name: "Criar conta" }).click()
  await page.getByLabel("Como podemos te chamar?").fill("Joana Nova")
  await page.getByLabel("E-mail").fill(email)
  const criar = page.getByRole("button", { name: "Criar minha conta" })
  await expect(criar).toBeEnabled() // o fallback DEV do Turnstile preenche o token
  await criar.click()
  // a mensagem da API (igual para e-mail novo e existente) toma o lugar do formulário
  await expect(page.getByText(/Se este e-mail puder ser usado, você vai receber em instantes um link/)).toBeVisible()
  await expect(page.getByLabel("Como podemos te chamar?")).toHaveCount(0)

  await expect.poll(() => linkDoEmail(email, "/definir-senha"), { timeout: 15_000 }).not.toBeNull()
  await page.goto(linkDoEmail(email, "/definir-senha")!)
  await expect.poll(() => new URL(page.url()).hash.includes("token")).toBe(false)
  await page.getByLabel("Nova senha", { exact: true }).fill(NOVA_SENHA)
  await page.getByLabel("Confirmar nova senha").fill(NOVA_SENHA)
  await page.getByRole("button", { name: "Definir senha" }).click()
  await expect(page).toHaveURL(/\/login$/)

  await entrar(page, "/login", email, NOVA_SENHA)
  await expect(page).toHaveURL(/\/conta$/)
  await expect(page.getByRole("heading", { name: /Sua\s+jornada/ })).toBeVisible()
  await expect(page.getByText("Olá, Joana").first()).toBeVisible()

  // o clamor logado (gratuito: um por dia) volta para a jornada com o tema e a oração
  await clamar(page, "Pela paz no meu trabalho.", "Trabalho e sustento")
  await identificar(page, { cpf: "52998224725" })
  await expect(page.getByLabel("E-mail")).toHaveValue(email)
  await contribuir(page, "Gratuito")
  await page.getByRole("button", { name: "Enviar meu clamor" }).click()
  await expect(page).toHaveURL(/\/confirmacao\?pedido_id=[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name: "Sua oração já está aí!" })).toBeVisible({ timeout: 30_000 })

  await page.goto("/conta")
  await expect(page.getByText("1 pedido", { exact: true })).toBeVisible()
  await expect(page.getByText("Trabalho e sustento", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Ver oração/ }).click()
  await expect(page.getByText("Senhor, guarda esta família com o Teu cuidado. Amém.")).toBeVisible()
})

const NOVO_ADMIN = `novo-admin-${Date.now()}@clama.test`

test("superusuario cria admin pela tela de usuarios", async ({ page }) => {
  await entrarNoPainel(page, "/admin/login", SUPER)
  await page.goto("/admin/usuarios")
  await page.getByRole("button", { name: "Novo admin" }).click()
  await page.getByLabel("E-mail").fill(NOVO_ADMIN)
  await page.getByLabel("Nome completo").fill("Novo Admin")
  await page.getByLabel("Senha", { exact: true }).fill(SENHA)
  await page.getByLabel("Confirmar senha").fill(SENHA)
  await page.getByRole("button", { name: "Criar admin" }).click()
  await expect(page.getByRole("cell", { name: NOVO_ADMIN })).toBeVisible()
  await expect(page.getByRole("row", { name: new RegExp(NOVO_ADMIN) }).getByText("Admin", { exact: true })).toBeVisible()
})

test("desativar a conta derruba a sessao aberta", async ({ browser }) => {
  const ctxAdmin = await browser.newContext()
  const ctxSuper = await browser.newContext()
  const admin = await ctxAdmin.newPage()
  const superPage = await ctxSuper.newPage()
  try {
    await entrar(admin, "/admin/login", NOVO_ADMIN)
    await expect(admin).toHaveURL(/\/admin$/)
    expect((await admin.request.get("/api/auth/eu")).status()).toBe(200)

    await entrarNoPainel(superPage, "/admin/login", SUPER)
    await superPage.goto("/admin/usuarios")
    await superPage.getByLabel("Buscar").fill(NOVO_ADMIN)
    await superPage.getByRole("button", { name: "Detalhes" }).click()
    await superPage.getByRole("button", { name: "Desativar conta" }).click()
    await superPage.getByRole("dialog").filter({ hasText: "Desativar conta?" }).getByRole("button", { name: "Desativar conta" }).click()
    await expect(superPage.getByText("Conta desativada.")).toBeVisible()

    expect((await admin.request.get("/api/auth/eu")).status()).toBe(401)
    await admin.goto("/admin/usuarios")
    await expect(admin).toHaveURL(/\/admin\/login/)
  } finally {
    await ctxAdmin.close()
    await ctxSuper.close()
  }
})

test("admin comum nao ve as acoes de escrita (so SUPERUSUARIO)", async ({ browser }) => {
  // promove cliente a ADMIN pela API como superusuario, depois entra como esse admin
  const ctxSuper = await browser.newContext()
  const s = await ctxSuper.newPage()
  await entrarNoPainel(s, "/admin/login", SUPER2)
  await s.goto("/admin/usuarios")
  await s.getByLabel("Buscar").fill(CLIENTE)
  await s.getByRole("button", { name: "Detalhes" }).click()
  await s.getByRole("button", { name: "Tornar admin" }).click()
  await s.getByRole("dialog").filter({ hasText: "Tornar admin?" }).getByRole("button", { name: "Tornar admin" }).click()
  await expect(s.getByText("Agora é admin.")).toBeVisible()
  await ctxSuper.close()

  const ctx = await browser.newContext()
  const a = await ctx.newPage()
  await entrar(a, "/login", CLIENTE)
  await expect(a).toHaveURL(/\/admin$/)
  await a.goto("/admin/usuarios")
  await expect(a.getByRole("button", { name: "Detalhes" }).first()).toBeVisible()
  await expect(a.getByRole("button", { name: "Novo admin" })).toHaveCount(0)
  await a.getByRole("button", { name: "Detalhes" }).first().click()
  await expect(a.getByRole("button", { name: "Excluir usuário" })).toHaveCount(0)
  await ctx.close()
})
