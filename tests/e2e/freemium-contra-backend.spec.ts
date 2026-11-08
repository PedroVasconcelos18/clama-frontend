import { test, expect, type Page } from "@playwright/test"

/**
 * Fluxo freemium contra um backend de verdade (Etapa 9, mapa §5.4): landing no modo gratuito → "Confira seu
 * e-mail" → link do e-mail → /confirmar → "Confirmar minha oração" → /confirmado → /confirmacao com a oração
 * enviada; depois o mesmo e-mail de novo é bloqueado (já tem conta).
 *
 * Só roda pelo `clama-api/scripts/e2e-local.sh` (Django ou Java local): o e-mail sai para o stub da Resend, e o
 * link é lido da caixa de saída dele (`E2E_OUTBOX_URL`). A Claude e o Turnstile também são o stub.
 */

const CAIXA = process.env.E2E_OUTBOX_URL ?? ""

interface EmailCapturado {
  to: string[]
  subject: string
  text?: string
  html?: string
}

function cpfValido(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const dv = (b: number[]) => {
    const r = (b.reduce((s, d, i) => s + d * (b.length + 1 - i), 0) * 10) % 11
    return r === 10 ? 0 : r
  }
  n.push(dv(n))
  n.push(dv(n))
  return n.join("")
}

const celular = () => `119${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`

async function preencherGratuito(page: Page, email: string) {
  await page.goto("/")
  await page.getByRole("radio", { name: /Gratuito/ }).click()
  // os <label> do form não apontam para o campo (sem htmlFor): placeholder e papel
  const form = page.locator("#prayer-form-gratuito")
  await form.getByPlaceholder("Como você se chama?").fill("Fulana E2E")
  await form.getByRole("spinbutton").fill("33")
  await form.getByRole("combobox").selectOption("feminino")
  await form.getByPlaceholder("seu@email.com.br").fill(email)
  await form.getByPlaceholder("000.000.000-00").fill(cpfValido())
  await form.getByPlaceholder("(11) 99999-9999").fill(celular())
  await form.getByPlaceholder(/Conte o que está no seu coração/).fill("Paz para a minha família.")
  await page.locator("#consent_aceito_gratuito").check()
  // o botão já está habilitado antes do token: o Turnstile (ou o fallback do dev, ~1,5 s) e o device_hash chegam
  // depois, em campos ocultos (PrayerFormGratuito)
  await expect(form.locator('input[name="turnstile_token"]')).not.toHaveValue("")
  await expect(form.locator('input[name="device_hash"]')).not.toHaveValue("")
  await page.getByRole("button", { name: "Receber minha oração gratuita" }).click()
}

async function emailsPara(page: Page, email: string): Promise<EmailCapturado[]> {
  const todos: EmailCapturado[] = await (await page.request.get(CAIXA)).json()
  return todos.filter((e) => e.to.some((t) => t.includes(email)))
}

test("freemium: pedido, link do e-mail, confirmação e status; o mesmo e-mail depois é bloqueado", async ({
  page,
}) => {
  test.skip(!CAIXA, "rode pelo clama-api/scripts/e2e-local.sh (precisa da caixa de saída do stub)")
  test.setTimeout(120_000)
  const email = `freemium-${Date.now()}@clama.test`

  // 1-2. pedido gratuito → "Confira seu e-mail"
  await preencherGratuito(page, email)
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible({ timeout: 15_000 })

  // 3. o link do e-mail de confirmação: a página /confirmar do front (FRONTEND_URL), com o token
  let link = ""
  await expect
    .poll(
      async () => {
        for (const e of await emailsPara(page, email)) {
          const m = `${e.html ?? ""} ${e.text ?? ""}`.match(/https?:\/\/[^\s"'<>]+\/confirmar\?token=[\w-]+/)
          if (m) link = m[0]
        }
        return link
      },
      { timeout: 30_000, message: "e-mail de confirmação com o link na caixa de saída" },
    )
    .not.toBe("")
  const front = new URL(page.url()).origin
  expect(link.startsWith(`${front}/confirmar?token=`), `link para o front: ${link}`).toBe(true)
  const token = new URL(link).searchParams.get("token")!

  // 4. o GET da API (links antigos, mail scanners) só redireciona para o front, sem consumir o token,
  // sem cache e sem referrer
  const r = await page.request.get(`/api/freemium/confirmar/?token=${token}`, { maxRedirects: 0 })
  expect(r.status()).toBe(302)
  expect(r.headers()["location"]).toBe(link)
  expect(r.headers()["cache-control"]).toContain("no-store")
  expect(r.headers()["referrer-policy"]).toBe("no-referrer")

  await page.goto(link)
  await expect(page).toHaveURL(/\/confirmar\?token=/)
  await page.getByRole("button", { name: "Confirmar minha oração" }).click()
  await expect(page).toHaveURL(/\/confirmado\?pedido_id=[\w-]+/)
  await expect(page.getByRole("heading", { name: "Sua oração está sendo preparada" })).toBeVisible()

  // status: a oração (stub da Claude) é gerada e enviada (stub da Resend)
  await page.getByRole("button", { name: "Acompanhar minha oração" }).click()
  await expect(page).toHaveURL(/\/confirmacao\?pedido_id=/)
  await expect(page.getByRole("heading", { name: "Sua oração já está aí!" })).toBeVisible({ timeout: 60_000 })
  expect((await emailsPara(page, email)).length, "confirmação + oração (+ credenciais)").toBeGreaterThanOrEqual(2)

  // 5. o mesmo e-mail outra vez: já tem conta → /login com o aviso
  await page.context().clearCookies()
  await preencherGratuito(page, email)
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
})
