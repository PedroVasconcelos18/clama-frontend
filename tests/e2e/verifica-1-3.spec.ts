import { test, expect } from "@playwright/test"

// BASE_URL/credenciais vêm do ambiente; o padrão é o cliente semeado por tests/e2e/suporte/rodar-conta.sh
const BASE = process.env.BASE_URL ?? "http://localhost:5173"
const EMAIL = process.env.VERIFICA_EMAIL ?? "cliente@clama.test"
const SENHA = process.env.VERIFICA_SENHA ?? "Senha-de-teste-123"

test("fluxo real de login: nenhuma chamada de API sai para origem absoluta", async ({ page }) => {
  const requisicoes: { url: string; method: string }[] = []
  page.on("request", (r) => requisicoes.push({ url: r.url(), method: r.method() }))

  await page.goto(`${BASE}/login`)
  await page.getByLabel(/e-?mail/i).fill(EMAIL)
  await page.getByLabel(/senha/i).first().fill(SENHA)
  await page.getByRole("button", { name: /entrar|login/i }).first().click()

  // Espera a chamada de login concluir
  await page.waitForResponse((r) => r.url().includes("/api/auth/login"), {
    timeout: 15000,
  })
  await page.waitForTimeout(1500)

  const chamadasApi = requisicoes.filter((r) => r.url.includes("/api/"))
  console.log("\n=== CHAMADAS DE API CAPTURADAS ===")
  for (const r of chamadasApi) console.log(`  ${r.method.padEnd(6)} ${r.url}`)

  // AC2: toda chamada de API parte do proprio host — nenhuma origem absoluta.
  const absolutas = chamadasApi.filter((r) => !r.url.startsWith(BASE))
  console.log("\n=== CHAMADAS PARA ORIGEM ABSOLUTA ===")
  console.log(absolutas.length === 0 ? "  nenhuma" : absolutas.map((a) => "  " + a.url).join("\n"))

  // Cookies emitidos
  const cookies = await page.context().cookies()
  console.log("\n=== COOKIES ===")
  for (const c of cookies) {
    console.log(`  ${c.name.padEnd(14)} path=${c.path.padEnd(6)} httpOnly=${c.httpOnly} sameSite=${c.sameSite}`)
  }

  // localStorage — nao pode conter token
  const storage = await page.evaluate(() => {
    const out: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      out[k] = localStorage.getItem(k) ?? ""
    }
    return out
  })
  console.log("\n=== localStorage ===")
  for (const [k, v] of Object.entries(storage)) console.log(`  ${k} = ${v.slice(0, 90)}`)

  expect(absolutas, "chamada de API para origem absoluta").toHaveLength(0)
  expect(JSON.stringify(storage)).not.toContain("accessToken")
  expect(JSON.stringify(storage)).not.toContain("refreshToken")
  // sessão por cookie: SESSION é HttpOnly; XSRF-TOKEN é legível por JS (o front o devolve no header)
  const sessao = cookies.find((c) => c.name === "SESSION")
  expect(sessao, "cookie SESSION").toBeDefined()
  expect(sessao!.httpOnly, "SESSION precisa ser HttpOnly").toBe(true)
  expect(cookies.find((c) => c.name === "XSRF-TOKEN")?.httpOnly).toBe(false)
})
