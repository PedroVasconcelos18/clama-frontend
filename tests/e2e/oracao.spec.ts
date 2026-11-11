import { createHmac, randomUUID } from "node:crypto"
import { test, expect, type APIRequestContext, type Page } from "@playwright/test"

/**
 * Oração contra o backend REAL, com o Mercado Pago e a Claude simulados por WireMock (e-mail: o perfil local só escreve
 * no log da API, nada sai). Rodar: `MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/oracao.spec.ts`.
 *
 * - Mapeamentos da Claude em `suporte/claude`: resposta padrão; "FORCAR-SEM-CREDITO" no pedido => 400 de crédito;
 *   "PROMPT-E2E-NOVO" no system prompt => outra oração.
 * - A "regeneração com sucesso" registra aqui um mapeamento mais prioritário para o mesmo marcador (como o pedido.spec
 *   faz com o GET do pagamento).
 */

const SENHA = "Senha-de-teste-123"
const SUPER = "super@clama.test"
const WIREMOCK = process.env.WIREMOCK_URL
const CLAUDE = process.env.CLAUDE_WIREMOCK_URL
const SEGREDO = process.env.MERCADOPAGO_WEBHOOK_SECRET
const ORACAO_PADRAO = "Senhor, guarda esta família com o Teu cuidado. Amém."
const ORACAO_REGENERADA = "Oração regenerada pelo admin. Amém."
const ORACAO_PROMPT_NOVO = "Oração do prompt novo do E2E. Amém."

test.describe.configure({ mode: "serial" })

let admin: Page

test.beforeAll(async ({ browser }) => {
  if (!WIREMOCK || !CLAUDE || !SEGREDO) throw new Error("Rode com MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh")
  admin = await (await browser.newContext()).newPage()
  await admin.goto("/admin/login")
  const botao = admin.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled()
  await admin.getByLabel("E-mail").fill(SUPER)
  await admin.getByLabel("Senha", { exact: true }).fill(SENHA)
  await botao.click()
  await expect(admin).toHaveURL(/\/admin$/)
})

test.afterAll(async () => {
  // Mesmo que o teste do prompt falhe no meio, a versão nova não pode ficar ativa (204 também sem versão ativa).
  const xsrf = (await admin?.context().cookies())?.find((c) => c.name === "XSRF-TOKEN")?.value ?? ""
  await admin?.request.delete("/api/admin/prompts/ativacao", { headers: { "X-XSRF-TOKEN": xsrf } })
  await admin?.context().close()
})

/** CPF válido a partir de 9 dígitos (o WireMock usa o CPF como id do pagamento no MP, então cada doação tem o seu). */
function cpf(base: number) {
  const d = String(base).padStart(9, "0").split("").map(Number)
  const dv = (n: number[]) => {
    const r = (n.reduce((s, x, i) => s + x * (n.length + 1 - i), 0) * 10) % 11
    return r === 10 ? 0 : r
  }
  d.push(dv(d))
  d.push(dv(d))
  return d.join("")
}

/** Doação anônima pela API (o formulário já é coberto pelo pedido.spec) + Pix. Devolve o id do pedido. */
async function doar(request: APIRequestContext, cpfCnpj: string, email: string, pedidoOracao: string) {
  await request.get("/api/auth/eu") // semeia o XSRF-TOKEN
  const xsrf = (await request.storageState()).cookies.find((c) => c.name === "XSRF-TOKEN")?.value ?? ""
  const headers = { "X-XSRF-TOKEN": xsrf }
  const r = await request.post("/api/doacoes", {
    headers,
    data: {
      nome: "Maria Oração", email, cpfCnpj, pedidoOracao, valorCentavos: 100, consentAceito: true,
      turnstileToken: "token-e2e", deviceHash: "abcdef1234567890",
    },
  })
  expect(r.status(), await r.text()).toBe(201)
  const id = (await r.json()).id as string
  expect((await request.post(`/api/pedidos/${id}/pix`, { headers })).status()).toBe(200)
  return id
}

async function pagar(request: APIRequestContext, mpId: string, pedidoId: string) {
  const reg = await request.post(`${WIREMOCK}/__admin/mappings`, {
    data: {
      request: { method: "GET", url: `/v1/payments/${mpId}` },
      response: {
        status: 200,
        jsonBody: {
          id: Number(mpId), status: "approved", status_detail: "accredited", external_reference: pedidoId,
          transaction_amount: 1, currency_id: "BRL", payment_method_id: "pix",
        },
      },
    },
  })
  expect(reg.ok()).toBe(true)
  const ts = String(Date.now())
  const requestId = randomUUID()
  const v1 = createHmac("sha256", SEGREDO!).update(`id:${mpId};request-id:${requestId};ts:${ts};`).digest("hex")
  const r = await request.post(`/api/webhooks/mercadopago?data.id=${mpId}&type=payment`, {
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    data: { id: `e2e-${randomUUID()}`, type: "payment", action: "payment.updated", data: { id: mpId } },
  })
  expect(r.status()).toBe(200)
}

const detalheAdmin = async (id: string) => (await admin.request.get(`/api/admin/pedidos/${id}`)).json()

let pedidoComErro = ""

test("doação paga: a confirmação mostra a oração gerada pela Claude simulada", async ({ page, request }) => {
  const cpfDoacao = cpf(111222333)
  const id = await doar(request, cpfDoacao, "oracao.feliz@clama.test", "Pela minha família")
  await page.goto(`/confirmacao?pedido_id=${id}`)
  await expect(page.getByText("Quase lá — pague com Pix")).toBeVisible()
  await pagar(request, cpfDoacao, id)
  await expect(page.getByRole("heading", { name: "Sua oração já está aí!" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(ORACAO_PADRAO, { exact: true })).toBeVisible()
})

test("crédito esgotado leva o pedido a ERRO e a confirmação mostra a mensagem pastoral", async ({ page, request }) => {
  const cpfDoacao = cpf(444555666)
  pedidoComErro = await doar(request, cpfDoacao, "oracao.erro@clama.test", "FORCAR-SEM-CREDITO pela minha mãe")
  await page.goto(`/confirmacao?pedido_id=${pedidoComErro}`)
  await pagar(request, cpfDoacao, pedidoComErro)
  await expect(page.getByRole("heading", { name: "Tivemos um soluço" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("link", { name: /Falar com a gente/ })).toBeVisible()
  expect((await detalheAdmin(pedidoComErro)).ultimoErro).toBe("credit_balance")
})

test("admin regenera o pedido em ERRO pelo drawer e a oração chega", async ({ request }) => {
  // O crédito "voltou": para o mesmo marcador, a Claude simulada passa a responder bem.
  const reg = await request.post(`${CLAUDE}/__admin/mappings`, {
    data: {
      priority: 1,
      request: {
        method: "POST", urlPath: "/v1/messages",
        bodyPatterns: [{ matchesJsonPath: { expression: "$.messages[0].content", contains: "FORCAR-SEM-CREDITO" } }],
      },
      response: {
        status: 200,
        jsonBody: {
          id: "msg_e2e_ok", type: "message", role: "assistant", model: "claude-sonnet-4-6",
          content: [{ type: "text", text: ORACAO_REGENERADA }], stop_reason: "end_turn", stop_sequence: null,
          usage: { input_tokens: 100, output_tokens: 20 },
        },
      },
    },
  })
  expect(reg.ok()).toBe(true)

  await admin.goto(`/admin/pedidos?id=${pedidoComErro}`)
  await expect(admin.getByRole("button", { name: "Regenerar oração" })).toBeVisible()
  await expect(admin.getByRole("button", { name: "Reenviar oração" })).toHaveCount(0)
  await expect(admin.getByRole("button", { name: "Conceder gratuidade" })).toHaveCount(0)
  await admin.getByRole("button", { name: "Regenerar oração" }).click()
  await admin.getByRole("button", { name: "Confirmar" }).click()
  await expect(admin.getByText("Regeneração solicitada.")).toBeVisible()

  await expect.poll(async () => (await detalheAdmin(pedidoComErro)).status, { timeout: 30_000 }).toBe("ENVIADA")
  expect((await detalheAdmin(pedidoComErro)).oracaoGerada).toBe(ORACAO_REGENERADA)

  // reaberto, com a oração enviada: agora só o reenvio
  await admin.goto(`/admin/pedidos?id=${pedidoComErro}`)
  await expect(admin.getByRole("button", { name: "Reenviar oração" })).toBeVisible()
  await expect(admin.getByRole("button", { name: "Regenerar oração" })).toHaveCount(0)
})

test("admin salva e ativa uma versão de prompt e a prévia muda", async () => {
  await admin.goto("/admin/prompts")
  const previa = async (versao: string) => {
    await admin.locator("[data-versao]").filter({ hasText: versao }).getByRole("button", { name: "Prévia" }).click()
    await admin.getByRole("button", { name: "Gerar prévia" }).click()
  }

  await previa("Padrão")
  await expect(admin.getByText(ORACAO_PADRAO)).toBeVisible({ timeout: 15_000 })
  await admin.keyboard.press("Escape")

  const sistema = admin.getByLabel("System prompt")
  await sistema.fill("PROMPT-E2E-NOVO: você escreve orações curtas.")
  await admin.getByRole("button", { name: "Salvar nova versão" }).click()
  await expect(admin.getByText("Nova versão criada. Ela ainda não está ativa.")).toBeVisible()
  const nova = admin.locator("[data-versao]").filter({ hasText: /Versão \d+/ }).first()
  await nova.getByRole("button", { name: "Ativar" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Ativar" }).click()
  await expect(nova).toContainText("Ativa")

  await nova.getByRole("button", { name: "Prévia" }).click()
  await admin.getByRole("button", { name: "Gerar prévia" }).click()
  await expect(admin.getByText(ORACAO_PROMPT_NOVO)).toBeVisible({ timeout: 15_000 })
  await expect(admin.getByText(ORACAO_PADRAO)).toHaveCount(0)
  await admin.keyboard.press("Escape")

  // devolve o ambiente ao padrão
  await admin.locator("[data-versao]").filter({ hasText: "Padrão" }).getByRole("button", { name: "Voltar ao padrão" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Voltar ao padrão" }).click()
  await expect(admin.getByText("Voltamos ao prompt padrão.")).toBeVisible()
})
