import { createHmac, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { test, expect, type APIRequestContext, type Page } from "@playwright/test"

/**
 * Operação (ondas 7a e 7b) contra o backend REAL: relatório de repasse, quitação em lote, ledger, tarefas, LGPD e métricas.
 * Rodar: `MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/operacao.spec.ts`.
 * As doações seguem o caminho de `pedido.spec.ts` (Pix simulado por WireMock, webhook assinado aqui).
 */

const SENHA = "Senha-de-teste-123"
const SUPER = "super@clama.test"
const WIREMOCK = process.env.WIREMOCK_URL
const SEGREDO = process.env.MERCADOPAGO_WEBHOOK_SECRET
const API_LOG = process.env.API_LOG
const INSTITUICAO = "Associação Teste"
const MARIA = { nome: "Maria Silva Santos", email: "doadora.um@clama.test", cpf: "52998224725" }
const JOAO = { nome: "João Pereira", email: "doador.dois@clama.test", cpf: "11144477735" }
const HOJE = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })

test.describe.configure({ mode: "serial" })

let admin: Page

test.beforeAll(async ({ browser }) => {
  if (!WIREMOCK || !SEGREDO || !API_LOG) throw new Error("Rode com MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh")
  admin = await (await browser.newContext({ acceptDownloads: true })).newPage()
  await admin.goto("/admin/login")
  const botao = admin.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled()
  await admin.getByLabel("E-mail").fill(SUPER)
  await admin.getByLabel("Senha", { exact: true }).fill(SENHA)
  await botao.click()
  await expect(admin).toHaveURL(/\/admin$/)
  await admin.goto("/admin/instituicoes")
  await admin.getByRole("button", { name: /Nova Instituição/ }).click()
  await admin.getByLabel("Nome").fill(INSTITUICAO)
  await admin.getByRole("button", { name: "Salvar" }).click()
  await expect(admin.getByRole("heading", { name: INSTITUICAO })).toBeVisible()
})

test.afterAll(async () => {
  await admin?.context().close()
})

const campo = (page: Page, name: string) => page.locator(`#fazer-pedido [name="${name}"]`)

async function aprovarNoMercadoPago(request: APIRequestContext, mpId: string, pedidoId: string, centavos: number) {
  const r = await request.post(`${WIREMOCK}/__admin/mappings`, {
    data: {
      request: { method: "GET", url: `/v1/payments/${mpId}` },
      response: {
        status: 200,
        jsonBody: {
          id: Number(mpId), status: "approved", status_detail: "accredited", external_reference: pedidoId,
          transaction_amount: centavos / 100, currency_id: "BRL", payment_method_id: "pix",
        },
      },
    },
  })
  expect(r.ok()).toBe(true)
}

async function webhookAssinado(request: APIRequestContext, mpId: string) {
  const ts = String(Date.now())
  const requestId = randomUUID()
  const v1 = createHmac("sha256", SEGREDO!).update(`id:${mpId};request-id:${requestId};ts:${ts};`).digest("hex")
  return request.post(`/api/webhooks/mercadopago?data.id=${mpId}&type=payment`, {
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    data: { id: `e2e-${randomUUID()}`, type: "payment", action: "payment.updated", data: { id: mpId } },
  })
}

/** Doação anônima de R$ 1,00 até o pedido pago (mesmo caminho do pedido.spec.ts). */
async function doarEPagar(page: Page, request: APIRequestContext, d: typeof MARIA) {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }))
  await page.goto("/")
  await campo(page, "nome").fill(d.nome)
  await campo(page, "email").fill(d.email)
  await campo(page, "cpf_cnpj").fill(d.cpf)
  await campo(page, "idade").fill("40")
  await campo(page, "sexo").selectOption("feminino")
  await page.locator("#consent_aceito_gratuito").check()
  await expect(page.getByRole("radio", { name: /^Livre/ })).toHaveAttribute("aria-checked", "true")
  const trigger = page.locator("#instituicao")
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await page.getByRole("option", { name: new RegExp(INSTITUICAO) }).click()
  await expect(campo(page, "turnstile_token")).not.toHaveValue("")
  await page.getByRole("button", { name: "Contribuir e receber minha oração" }).click()
  await expect(page).toHaveURL(/\/confirmacao\?pedido_id=[0-9a-f-]{36}$/)
  const pedidoId = new URL(page.url()).searchParams.get("pedido_id")!
  await expect(page.getByText(`00020126-e2e-copia-e-cola-${d.cpf}`)).toBeVisible()
  await aprovarNoMercadoPago(request, d.cpf, pedidoId, 100)
  expect((await webhookAssinado(request, d.cpf)).status()).toBe(200)
  await expect(page.getByRole("heading", { name: /Seu clamor foi recebido|Sua oração já está aí!/ })).toBeVisible({ timeout: 15_000 })
}

async function baixar(page: Page, abrir: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent("download"), abrir()])
  const chunks: Buffer[] = []
  for await (const c of await download.createReadStream()) chunks.push(c as Buffer)
  return Buffer.concat(chunks)
}

async function escolherPeriodoDeHoje() {
  await admin.goto("/admin/relatorios")
  await admin.getByLabel("Instituição").selectOption({ label: INSTITUICAO })
  await admin.getByLabel("Período").selectOption("datas")
  await admin.getByLabel("De").fill(HOJE)
  await admin.getByLabel("Até").fill(HOJE)
}

test("1. duas doações pagas para a Associação Teste", async ({ browser, request }) => {
  for (const d of [MARIA, JOAO]) {
    const ctx = await browser.newContext()
    await doarEPagar(await ctx.newPage(), request, d)
    await ctx.close()
  }
})

test("2. relatório do dia mostra o nome abreviado e o total", async () => {
  await escolherPeriodoDeHoje()
  await expect(admin.getByText("Maria S.")).toBeVisible()
  await expect(admin.getByText("TOTAL (2 doações)")).toBeVisible()
  await expect(admin.getByText("Maria Silva Santos")).toHaveCount(0)
})

test("3. CSV da instituição sem e-mail; o interno com e-mail e o aviso", async () => {
  await escolherPeriodoDeHoje()
  await expect(admin.getByText("TOTAL (2 doações)")).toBeVisible()
  const csv = await baixar(admin, () => admin.getByRole("link", { name: "Baixar CSV da instituição" }).click())
  expect([...csv.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const texto = csv.toString("utf8")
  expect(texto).toContain("Maria S.;")
  expect(texto).not.toContain("@")

  await admin.getByRole("button", { name: "Baixar auditoria interna" }).click()
  await expect(admin.getByText("Não entregar à instituição")).toBeVisible()
  const internoBytes = await baixar(admin, () => admin.getByRole("link", { name: /Entendi, baixar/ }).click())
  expect([...internoBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const interno = internoBytes.toString("utf8")
  expect(interno).toContain(MARIA.email)
  expect(interno).toContain("USO INTERNO")
})

test("4. quitar os dois pendentes com comprovante", async () => {
  await escolherPeriodoDeHoje()
  await admin.getByRole("button", { name: "Marcar 2 pendentes como transferidos" }).click()
  await admin.getByLabel("Comprovante").fill("PIX-LOTE-E2E")
  await admin.getByRole("button", { name: "Confirmar transferência" }).click()
  await expect(admin.getByRole("button", { name: /pendentes como transferidos/ })).toHaveCount(0)

  await admin.goto("/admin/repasses")
  const linhas = admin.getByRole("row").filter({ hasText: INSTITUICAO })
  await expect(linhas).toHaveCount(2)
  for (const l of await linhas.all()) {
    await expect(l).toContainText("Transferido")
    await expect(l).toContainText("PIX-LOTE-E2E")
  }
})

test("5. conferir ledger: consistente", async () => {
  await admin.goto("/admin/relatorios")
  await admin.getByRole("button", { name: "Conferir ledger" }).click()
  await expect(admin.getByText(/Ledger consistente/)).toBeVisible()
})

test("6. tarefa mensal: próximo dia 28 às 10:00, simulação no histórico, execução real manda o e-mail sem PII", async () => {
  await admin.goto("/admin/tarefas")
  const tarefa = admin.getByRole("region", { name: "relatorio-repasse-mensal" })
  await expect(tarefa).toContainText(/28\/\d{2}\/\d{4},? 10:00/)

  await tarefa.getByRole("button", { name: "Rodar agora" }).click()
  await expect(admin.getByLabel("Só simular")).toBeChecked()
  await admin.getByRole("button", { name: "Simular" }).click()
  await tarefa.getByRole("button", { name: "Histórico" }).click()
  await expect(tarefa.getByTestId("execucao").filter({ hasText: "simulação" }).filter({ hasText: "ciclo" }))
    .toHaveCount(1, { timeout: 20_000 })

  await tarefa.getByRole("button", { name: "Rodar agora" }).click()
  await admin.getByLabel("Só simular").uncheck()
  await admin.getByRole("button", { name: "Rodar de verdade" }).click()
  await expect(tarefa.getByTestId("execucao").filter({ hasText: "real" })).toHaveCount(1, { timeout: 20_000 })

  const log = readFileSync(API_LOG!, "utf8")
  const inicio = log.indexOf("Repasse do ciclo")
  expect(inicio).toBeGreaterThan(-1)
  // o e-mail local vai até a próxima linha de log com data (as linhas do texto não começam com ano)
  const proxima = log.slice(inicio).search(/\n\d{4}-\d{2}-\d{2}[ T]/)
  const email = proxima < 0 ? log.slice(inicio) : log.slice(inicio, inicio + proxima)
  expect(email).toContain("/admin/relatorios")
  expect(email).not.toContain("Maria")
})

test("7. dashboard: tarefas em dia", async () => {
  await admin.goto("/admin")
  await expect(admin.getByText("Tarefas: tudo em dia")).toBeVisible()
})

// ---- 7b: LGPD e métricas (a Maria foi doadora no passo 1; o passo 10 a exclui) ----

async function buscarTitular(email: string) {
  await admin.goto("/admin/lgpd")
  await admin.getByLabel("E-mail do titular").fill(email)
  await admin.getByRole("button", { name: "Buscar" }).click()
  await expect(admin.getByLabel("Prévia")).toBeVisible()
}

test("8. LGPD: a prévia da Maria conta o pedido com pagamento como anonimizado", async () => {
  await buscarTitular(MARIA.email)
  await expect(admin.getByText("1 pedido será anonimizado (tem pagamento)")).toBeVisible()
  await expect(admin.getByText(/0 pedidos serão apagados/)).toBeVisible()
})

test("9. o JSON exportado tem o nome completo e a seção de compartilhamento", async () => {
  await buscarTitular(MARIA.email)
  const bytes = await baixar(admin, () => admin.getByRole("button", { name: "Exportar dados (JSON)" }).click())
  const json = JSON.parse(bytes.toString("utf8"))
  expect(bytes.toString("utf8")).toContain("Maria Silva Santos")
  expect(json.pedidos[0].nome).toBe(MARIA.nome)
  expect(Array.isArray(json.compartilhamento)).toBe(true)
  expect(json.compartilhamento.length).toBeGreaterThan(0)
})

test("10. excluir digitando o e-mail; o relatório mostra (sem nome) no lugar de Maria S.", async () => {
  await buscarTitular(MARIA.email)
  await admin.getByRole("button", { name: "Excluir dados" }).click()
  const confirmar = admin.getByRole("dialog").getByRole("button", { name: "Excluir dados" })
  await expect(confirmar).toBeDisabled()
  await admin.getByLabel(/Digite/).fill(MARIA.email)
  await expect(confirmar).toBeEnabled()
  await confirmar.click()
  await expect(admin.getByText(/1 anonimizado/)).toBeVisible()

  await escolherPeriodoDeHoje()
  await expect(admin.getByText("TOTAL (2 doações)")).toBeVisible()
  await expect(admin.getByText("(sem nome)")).toBeVisible()
  await expect(admin.getByText("Maria S.")).toHaveCount(0)
})

test("11. a ficha de outro usuário leva a /admin/lgpd com o e-mail preenchido e a URL sem ele", async () => {
  await admin.goto("/admin/usuarios")
  await admin.getByRole("row").filter({ hasText: "cliente@clama.test" }).getByRole("button", { name: "Detalhes" }).click()
  await admin.getByRole("dialog", { name: "Detalhes do usuário" }).getByRole("button", { name: "Dados do titular (LGPD)" }).click()
  await expect(admin).toHaveURL(/\/admin\/lgpd$/)
  await expect(admin.getByLabel("E-mail do titular")).toHaveValue("cliente@clama.test")
  expect(admin.url()).not.toContain("cliente")
  expect(admin.url()).not.toContain("@")
})

test("12. dashboard: 2 pagos e a latência", async () => {
  await admin.goto("/admin")
  const valor = (titulo: string) => admin.getByText(titulo, { exact: true }).locator("xpath=following-sibling::*[1]")
  await expect(valor("Pagos")).toHaveText("2")
  await expect(valor("Faturamento")).toContainText("2,00")
  await expect(valor("Latência do pedido (p50 / p90)")).toHaveText(/\d+ s|\d+,\d min/)
})
