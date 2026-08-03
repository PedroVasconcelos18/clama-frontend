import { test, expect } from "@playwright/test"

const BASE = "http://localhost:5173"

test("fluxo real de login: nenhuma chamada de API sai para origem absoluta", async ({ page }) => {
  const requisicoes: { url: string; method: string }[] = []
  page.on("request", (r) => requisicoes.push({ url: r.url(), method: r.method() }))

  await page.goto(`${BASE}/login`)
  await page.getByLabel(/e-?mail/i).fill("verifica@clama.test")
  await page.getByLabel(/senha/i).first().fill("Senha-Verifica-123!")
  await page.getByRole("button", { name: /entrar|login/i }).first().click()

  // Espera a chamada de login concluir
  await page.waitForResponse((r) => r.url().includes("/api/customer/auth/login/"), {
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
  const auth = cookies.filter((c) => c.name.startsWith("clama_"))
  expect(auth.length).toBeGreaterThan(0)
  for (const c of auth) {
    expect(c.path, `${c.name} precisa ter Path=/api`).toBe("/api")
    expect(c.httpOnly, `${c.name} precisa ser HttpOnly`).toBe(true)
  }
})
