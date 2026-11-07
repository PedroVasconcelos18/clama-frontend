import { test, expect, type Page } from "@playwright/test"

/**
 * Etapa 7 do admin, com a API inteira mockada (nenhum back no ar).
 * Rodar: `npm run dev` à parte e `BASE_URL=http://localhost:5173 npm run test:e2e -- tests/e2e/admin-etapa-7.spec.ts`.
 */

type Chamada = { method: string; path: string; query: URLSearchParams; body: unknown }

const pagina = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results })

const CLIENTE = {
  id: 7, email: "ana@exemplo.com", nome_completo: "Ana", date_joined: "2026-10-01T10:00:00Z",
  freemium_used_at: null, is_clama_admin: false, total_pedidos: 3, pedidos_pagos: 2, pedidos_gratuitos: 1,
  total_comentarios: 2, is_banned: false, motivo_ban: null, banido_em: null,
}
const DETALHE = {
  ...CLIENTE, last_login: null, is_active: true, cpf_cnpj: null, telefone: null, nome_format_blog: "compacto",
  is_banned: false, banimentos: [],
}
const PEDIDO_ID = "12345678-aaaa-bbbb-cccc-1234567890ab"
const PEDIDO = {
  id: PEDIDO_ID, nome: "Ana", email: "ana@exemplo.com", plano_nome: "Mensal", valor_reais_str: "R$ 10,00",
  status: "enviada", canal_entrega: "email", created_at: "2026-11-01T10:00:00Z",
}
const COMENTARIO = {
  id: "c1", post: null, customer: 42, customer_email: "bia@exemplo.com", customer_nome: "Bia", conteudo: "oi",
  is_suspeito: false, ip_address: "1.2.3.4", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
  post_espelho_slug: "meu-post", post_espelho_titulo: "Meu post", post_espelho_url: null,
}
const BANIDO = {
  id: "ban-uuid-1", customer: 42, customer_email: "bia@exemplo.com", customer_nome: "Bia", motivo: "ofensa",
  banido_em: "2026-11-01T10:00:00Z", banido_por_email: "pedro@clama.me", revogado_em: null,
}
const WEBHOOK = {
  id: "w1", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z", provider: "MERCADO_PAGO",
  event_type: "payment", status: "ERRO", external_event_id: "evt-123", pedido_id: PEDIDO_ID, error_message: "falhou",
}
const REPASSE = {
  id: "r1", pedido_id: PEDIDO_ID, instituicao_id: "i1", instituicao_nome: "Mar de Espanha", valor_base_centavos: 10000,
  percentual: 10, valor_centavos: 1000, status: "registrado", transferido_em: null, comprovante: "",
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
}
const BLOQUEIO = {
  id: "b1", created_at: "2026-11-01T10:00:00Z", cpf_hash_curto: "cafe1234", email_hash_curto: "beef5678",
  tem_telefone: true, tem_device: false, tem_ip: true,
}

// rotas da API sem mock: o teste falha (afterEach) em vez de passar em cima de um 200 inventado
let desconhecidas: string[] = []
test.beforeEach(() => {
  desconhecidas = []
})
test.afterEach(() => {
  expect(desconhecidas).toEqual([])
})

async function preparar(page: Page) {
  const chamadas: Chamada[] = []
  await page.addInitScript(() => {
    localStorage.setItem(
      "clama:admin-auth",
      JSON.stringify({ user: { id: 1, email: "pedro@clama.me", nome_completo: "Pedro" } }),
    )
  })
  await page.route("**/api/**", async (route) => {
    const req = route.request()
    // o Vite em dev serve módulos com "/api/" no caminho (ex.: src/lib/api...); só fetch/xhr é API
    if (!["fetch", "xhr"].includes(req.resourceType())) return route.fallback()
    const url = new URL(req.url())
    const path = url.pathname
    const method = req.method()
    let body: unknown = null
    try {
      body = req.postDataJSON()
    } catch {
      /* sem corpo */
    }
    if (path !== "/api/csrf/") chamadas.push({ method, path, query: url.searchParams, body })
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })

    if (path === "/api/csrf/") return json({ csrf_token: "t" })
    const conhecidas: Record<string, string> = {
      "DELETE /api/blog/admin/banned-customers/42/": "",
      "DELETE /api/admin/customers/7/": "",
    }
    if (method !== "GET") {
      if (`${method} ${path}` in conhecidas) return route.fulfill({ status: 204 })
      desconhecidas.push(`escrita ${method} ${path}`)
      return json({ detail: "sem mock" }, 500)
    }
    if (path === "/api/admin/customers/") return json(pagina([CLIENTE]))
    if (path === "/api/admin/customers/7/") return json(DETALHE)
    if (path === "/api/admin/pedidos/") return json(pagina([PEDIDO]))
    if (path === "/api/blog/admin/comments/") return json(pagina([COMENTARIO]))
    if (path === "/api/blog/admin/banned-customers/") return json(pagina([BANIDO]))
    if (path === "/api/admin/webhooks/") return json(pagina([WEBHOOK]))
    if (path === "/api/admin/webhooks/w1/") return json({ ...WEBHOOK, payload: {} })
    if (path === "/api/admin/repasses/") return json(pagina([REPASSE]))
    if (path === "/api/admin/freemium/bloqueios/") return json(pagina([BLOQUEIO]))
    desconhecidas.push(`leitura GET ${path}`)
    return json({ detail: "sem mock" }, 500)
  })
  const escritas = () => chamadas.filter((c) => c.method !== "GET")
  const ultima = (path: string) => chamadas.filter((c) => c.method === "GET" && c.path === path).at(-1)
  return { chamadas, escritas, ultima }
}

test.describe("Admin, etapa 7 (API mockada)", () => {
  test("revogar ban no blog usa o id do customer e pede confirmacao", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/blog/banidos")
    await page.getByRole("button", { name: "Revogar" }).click()
    await expect(page.getByRole("heading", { name: "Revogar banimento" })).toBeVisible()
    expect(escritas()).toHaveLength(0)
    await page.getByRole("dialog").getByRole("button", { name: "Revogar" }).click()
    await expect.poll(() => escritas().map((c) => `${c.method} ${c.path}`)).toEqual([
      "DELETE /api/blog/admin/banned-customers/42/",
    ])
  })

  test("Customers tem o botao Banir, que pede confirmacao antes de banir", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/customers")
    await page.getByRole("button", { name: "Banir" }).click()
    await expect(page.getByRole("heading", { name: "Banir do blog" })).toBeVisible()
    expect(escritas()).toHaveLength(0)
  })

  test("filtro de comentarios por post envia post_espelho", async ({ page }) => {
    const { ultima } = await preparar(page)
    await page.goto("/admin/blog/comentarios")
    await expect(page.getByText("Meu post")).toBeVisible()
    await page.getByPlaceholder("Filtrar por slug do post").fill("meu-post")
    await expect.poll(() => ultima("/api/blog/admin/comments/")?.query.get("post_espelho")).toBe("meu-post")
  })

  test("excluir comentario pede confirmacao", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/blog/comentarios")
    await page.getByRole("button", { name: "Excluir" }).click()
    await expect(page.getByRole("heading", { name: "Excluir comentário" })).toBeVisible()
    expect(escritas()).toHaveLength(0)
  })

  for (const rota of ["/admin/blog", "/admin/blog/posts", "/admin/blog/posts/novo", "/admin/blog/posts/abc/editar"]) {
    test(`rota do Post ${rota} cai no NotFound`, async ({ page }) => {
      await preparar(page)
      await page.goto(rota)
      await expect(page.getByRole("heading", { name: /404/ })).toBeVisible()
    })
  }

  test("Repasses lista", async ({ page }) => {
    await preparar(page)
    await page.goto("/admin/repasses")
    await expect(page.getByRole("heading", { name: "Repasses" })).toBeVisible()
    await expect(page.getByText("Mar de Espanha")).toBeVisible()
  })

  test("Webhooks lista e reprocessar pede confirmacao", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/webhooks")
    await expect(page.getByText("evt-123")).toBeVisible()
    await page.getByRole("button", { name: "Detalhes" }).click()
    await page.getByRole("button", { name: /Reprocessar/ }).click()
    await expect(page.getByText("Reprocessar webhook?")).toBeVisible()
    expect(escritas()).toHaveLength(0)
  })

  test("Freemium lista e desbloquear pede confirmacao", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/freemium")
    await expect(page.getByText("beef5678")).toBeVisible()
    await page.getByRole("button", { name: "Desbloquear" }).click()
    await expect(page.getByText("Desbloquear freemium?")).toBeVisible()
    expect(escritas()).toHaveLength(0)
  })

  test("Customers: filtro Tipo envia admin= e a lista aparece", async ({ page }) => {
    const { ultima } = await preparar(page)
    await page.goto("/admin/customers")
    await expect(page.getByText("ana@exemplo.com")).toBeVisible()
    await page.getByLabel("Tipo").selectOption("true")
    await expect.poll(() => ultima("/api/admin/customers/")?.query.get("admin")).toBe("true")
  })

  test("acoes de usuario: toda destrutiva pede confirmacao e excluir exige o e-mail", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/customers")
    await page.getByRole("button", { name: "Detalhes" }).click()
    const drawer = page.getByRole("dialog", { name: "Detalhes do customer" })

    for (const [botao, titulo] of [
      ["Tornar admin", "Tornar admin?"],
      ["Desativar conta", "Desativar conta?"],
      ["Definir senha", "Definir senha"],
    ] as const) {
      await drawer.getByRole("button", { name: botao }).click()
      await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
      expect(escritas()).toHaveLength(0)
      await page.getByRole("button", { name: "Cancelar" }).click()
    }

    await drawer.getByRole("button", { name: "Excluir usuário" }).click()
    const confirmar = page.getByRole("dialog").filter({ hasText: "Excluir usuário?" }).getByRole("button", { name: "Excluir usuário" })
    await expect(confirmar).toBeDisabled()
    await page.getByLabel(/Digite/).fill("ana@exemplo.com")
    await expect(confirmar).toBeEnabled()
    expect(escritas()).toHaveLength(0)
    await confirmar.click()
    await expect.poll(() => escritas().map((c) => `${c.method} ${c.path}`)).toEqual([
      "DELETE /api/admin/customers/7/",
    ])
  })

  test("Pedidos lista, filtra por canal, q e status; a lista pede limit", async ({ page }) => {
    const { ultima } = await preparar(page)
    await page.goto("/admin/pedidos")
    await expect(page.getByText("R$ 10,00")).toBeVisible()
    expect(ultima("/api/admin/pedidos/")?.query.get("limit")).toBe("20")
    await page.getByLabel("Canal").selectOption("whatsapp")
    await expect.poll(() => ultima("/api/admin/pedidos/")?.query.get("canal")).toBe("whatsapp")
    await page.getByLabel("Status").selectOption("enviada")
    await expect.poll(() => ultima("/api/admin/pedidos/")?.query.get("status")).toBe("enviada")
    await page.getByLabel("Buscar pedidos").fill("ana")
    await expect.poll(() => ultima("/api/admin/pedidos/")?.query.get("q")).toBe("ana")
  })
})
