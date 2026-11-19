import { createHmac, randomUUID } from "node:crypto"
import { test, expect, type APIRequestContext, type Page } from "@playwright/test"
import { clamar, contribuir, identificar } from "./suporte/clamor"

/**
 * Pedido e pagamento contra o backend REAL (v2: home → tema → texto → entrega → contribuição → Pix → oração na tela), com o Mercado Pago simulado por WireMock e o Turnstile pela chave de
 * teste da Cloudflare (o backend local aceita qualquer token com ela).
 * Rodar: `MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/pedido.spec.ts`.
 *
 * - O WireMock cria o Pix com id = CPF do pagador (`suporte/mercadopago/mappings`): o teste sabe o id sem ler nada.
 * - O GET do pagamento (approved, valor exato, BRL, referência = pedido) é registrado aqui, por pedido, porque a
 *   referência só existe depois que o pedido nasce.
 * - O webhook é assinado aqui com o MERCADOPAGO_WEBHOOK_SECRET do script (HMAC igual ao do MP).
 */

const SENHA = "Senha-de-teste-123"
const SUPER = "super@clama.test"
const CLIENTE = "cliente@clama.test"
const WIREMOCK = process.env.WIREMOCK_URL
const SEGREDO = process.env.MERCADOPAGO_WEBHOOK_SECRET
const INSTITUICAO = "Casa do Pedido E2E"
const DOADORA = { nome: "Maria Doadora", email: "maria.e2e@clama.test", cpf: "52998224725" }
const ORACAO_PADRAO = "Senhor, guarda esta família com o Teu cuidado. Amém."
const RETRY = { email: "retry@clama.test", cpf: "11144477735" } // o WireMock falha o 1º Pix deste e-mail (501)

test.describe.configure({ mode: "serial" })

let admin: Page
let pedidoDaDoadora = ""

test.beforeAll(async ({ browser }) => {
  if (!WIREMOCK || !SEGREDO) throw new Error("Rode com MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh")
  admin = await (await browser.newContext()).newPage()
  await entrar(admin, "/admin/login", SUPER)
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

async function entrar(page: Page, rota: string, email: string) {
  await page.goto(rota)
  const botao = page.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled()
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill(SENHA)
  await botao.click()
}

async function pedidoDaUrl(page: Page) {
  await expect(page).toHaveURL(/\/confirmacao\?pedido_id=[0-9a-f-]{36}$/)
  return new URL(page.url()).searchParams.get("pedido_id")!
}

/** GET /v1/payments/{mpId} do WireMock: aprovado, com o valor exato, em BRL, para este pedido. */
async function aprovarNoMercadoPago(request: APIRequestContext, mpId: string, pedidoId: string, centavos: number) {
  const r = await request.post(`${WIREMOCK}/__admin/mappings`, {
    data: {
      request: { method: "GET", url: `/v1/payments/${mpId}` },
      response: {
        status: 200,
        jsonBody: {
          id: Number(mpId),
          status: "approved",
          status_detail: "accredited",
          external_reference: pedidoId,
          transaction_amount: centavos / 100,
          currency_id: "BRL",
          payment_method_id: "pix",
        },
      },
    },
  })
  expect(r.ok()).toBe(true)
}

/** Notificação do MP assinada: x-signature = ts + HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. */
async function webhookAssinado(request: APIRequestContext, mpId: string) {
  const ts = String(Date.now())
  const requestId = randomUUID()
  const v1 = createHmac("sha256", SEGREDO!).update(`id:${mpId};request-id:${requestId};ts:${ts};`).digest("hex")
  return request.post(`/api/webhooks/mercadopago?data.id=${mpId}&type=payment`, {
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    data: { id: `e2e-${randomUUID()}`, type: "payment", action: "payment.updated", data: { id: mpId } },
  })
}

test("doação anônima: tema, texto, R$ 25 para a instituição, Pix pago e a oração na tela com o aviso de IA", async ({ page, request }) => {
  await clamar(page, "Pela saúde da minha mãe, que vai operar.", "Saúde")
  // a Claude simulada responde SEM_RISCO à triagem: a entrega não mostra o CVV
  await expect(page.getByRole("note", { name: "Apoio em crise" })).toHaveCount(0)
  await expect(page.getByText("Pela saúde da minha mãe, que vai operar.")).toBeVisible()
  await identificar(page, DOADORA)
  await expect(page.getByRole("radio", { name: "Gratuito" })).toHaveAttribute("aria-checked", "true")
  await contribuir(page, "R$ 25", INSTITUICAO)
  await page.getByRole("button", { name: "Contribuir com R$ 25,00 e enviar" }).click()

  pedidoDaDoadora = await pedidoDaUrl(page)
  await expect(page.getByText("Quase lá — pague com Pix")).toBeVisible()
  await expect(page.getByText(`00020126-e2e-copia-e-cola-${DOADORA.cpf}`)).toBeVisible()
  await expect(page.getByAltText("QR code Pix para pagamento")).toBeVisible()

  await aprovarNoMercadoPago(request, DOADORA.cpf, pedidoDaDoadora, 2500)
  const r = await webhookAssinado(request, DOADORA.cpf)
  expect(r.status()).toBe(200)
  expect(await r.json()).toEqual({ status: "ok" })

  // polling de 5 s: sai do Pix e a oração aparece na tela (a Claude simulada responde na hora)
  await expect(page.getByRole("heading", { name: "Sua oração já está aí!" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(ORACAO_PADRAO, { exact: true })).toBeVisible()
  await expect(page.getByText("Escrita com ajuda de IA a partir das suas palavras.")).toBeVisible()
  await expect(page.getByText(`00020126-e2e-copia-e-cola-${DOADORA.cpf}`)).toHaveCount(0)
  // pago anônimo (decisão 1): sem senha na tela, o link vai no e-mail da oração
  await expect(page.getByText("Se você ainda não tem senha no Clama, o link para criar a sua vai junto com a oração no seu e-mail.")).toBeVisible()
})

test("admin acha o pedido pelo e-mail exato e marca o repasse como transferido", async () => {
  await admin.goto("/admin/pedidos")
  await admin.getByLabel("Buscar pedidos").fill(DOADORA.email)
  const linha = admin.getByRole("row").filter({ hasText: DOADORA.nome })
  await expect(linha).toHaveCount(1)
  await expect(linha).toContainText(pedidoDaDoadora.slice(0, 8))
  await expect(linha).toContainText("Enviada")
  await expect(admin.getByText("1 no total")).toBeVisible()

  await admin.goto("/admin/repasses")
  const repasse = admin.getByRole("row").filter({ hasText: pedidoDaDoadora.slice(0, 8) })
  await expect(repasse).toContainText(INSTITUICAO)
  await expect(repasse).toContainText("Registrado")
  await expect(repasse).toContainText(/R\$\s*5,00/) // 20% de R$ 25,00
  await repasse.getByRole("button", { name: "Marcar transferido" }).click()
  await admin.getByLabel("Comprovante").fill("PIX-E2E-001")
  await admin.getByRole("button", { name: "Confirmar transferência" }).click()
  await expect(repasse).toContainText("Transferido")
  await expect(repasse).toContainText("PIX-E2E-001")
  await expect(repasse.getByRole("button", { name: "Marcar transferido" })).toHaveCount(0)
})

test("logado pago: o Pix falha, tentar de novo reusa o pedido e a conta lista um só", async ({ page }) => {
  await entrar(page, "/login", CLIENTE)
  await expect(page).toHaveURL(/\/conta$/)
  await clamar(page, "Por um emprego novo.")
  // o e-mail do pedido; o dono continua sendo a conta
  await identificar(page, { email: RETRY.email, cpf: RETRY.cpf })
  await contribuir(page, "Livre", INSTITUICAO, "5")
  await page.getByRole("button", { name: "Contribuir com R$ 5,00 e enviar" }).click()

  const id = await pedidoDaUrl(page)
  await expect(page.getByText("Tivemos um soluço com o pagamento. Pode tentar novamente em instantes.")).toBeVisible()
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.getByText(`00020126-e2e-copia-e-cola-${RETRY.cpf}`)).toBeVisible()
  expect(new URL(page.url()).searchParams.get("pedido_id")).toBe(id)

  // Sua jornada: um pedido só, aguardando pagamento, com o "Ver Pix" de volta para a mesma confirmação
  await page.goto("/conta")
  const verPix = page.getByRole("link", { name: "Ver Pix" })
  await expect(verPix).toHaveCount(1)
  await expect(page.getByText("1 pedido", { exact: true })).toBeVisible()
  await expect(page.getByText(/R\$\s*5,00/)).toBeVisible()
  await verPix.click()
  await expect(page).toHaveURL(new RegExp(`pedido_id=${id}$`))
  await expect(page.getByText(`00020126-e2e-copia-e-cola-${RETRY.cpf}`)).toBeVisible()

  // e o admin vê um pedido só para esse e-mail
  await admin.goto("/admin/pedidos")
  await admin.getByLabel("Buscar pedidos").fill(RETRY.email)
  await expect(admin.getByText("1 no total")).toBeVisible()
  await expect(admin.getByRole("row").filter({ hasText: id.slice(0, 8) })).toContainText("Aguardando pagamento")
})
