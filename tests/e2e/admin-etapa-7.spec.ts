import { test, expect, type Page } from "@playwright/test"

/**
 * Etapa 7 do admin, com a API inteira mockada (nenhum back no ar).
 * Rodar: `npm run dev` à parte e `BASE_URL=http://localhost:5173 npm run test:e2e -- tests/e2e/admin-etapa-7.spec.ts`.
 * Pedidos, eventos do MP e repasses saíram daqui na onda 4a: o `pedido.spec.ts` os cobre contra o backend real.
 */

type Chamada = { method: string; path: string; query: URLSearchParams; body: unknown }

const pagina = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results })
// PagedModel do clama-api (`/api/admin/usuarios`)
const paginaUsuarios = <T,>(content: T[]) => ({
  content,
  page: { number: 0, size: 20, totalElements: content.length, totalPages: 1 },
})
const SUPERUSUARIO = { id: 1, email: "pedro@clama.me", nomeCompleto: "Pedro", nomeFormatoBlog: "compacto", papel: "SUPERUSUARIO" }

const USUARIO = {
  id: 7, email: "ana@exemplo.com", nomeCompleto: "Ana", criadoEm: "2026-10-01T10:00:00Z",
  ultimoLoginEm: null, papel: "CLIENTE", ativo: true, temSenha: true,
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
const BLOQUEIO = {
  id: 1, criadoEm: "2026-11-01T10:00:00Z", cpfHmacCurto: "cafe12345678…", emailHmacCurto: "beef56781234…", temIp: true,
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
    chamadas.push({ method, path, query: url.searchParams, body })
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })

    // a sessão do boot: o painel só abre para ADMIN/SUPERUSUARIO
    if (path === "/api/auth/eu") return json(SUPERUSUARIO)
    const conhecidas: Record<string, string> = {
      "DELETE /api/blog/admin/banned-customers/42/": "",
      "DELETE /api/admin/usuarios/7": "",
    }
    if (method !== "GET") {
      if (`${method} ${path}` in conhecidas) return route.fulfill({ status: 204 })
      desconhecidas.push(`escrita ${method} ${path}`)
      return json({ detail: "sem mock" }, 500)
    }
    if (path === "/api/admin/usuarios") return json(paginaUsuarios([USUARIO]))
    if (path === "/api/admin/usuarios/7") return json(USUARIO)
    if (path === "/api/blog/admin/comments/") return json(pagina([COMENTARIO]))
    if (path === "/api/blog/admin/banned-customers/") return json(pagina([BANIDO]))
    if (path === "/api/admin/freemium/bloqueios") return json(paginaUsuarios([BLOQUEIO]))
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

  // onda 6: o ban do blog sai da lista de usuários e volta com o módulo do blog
  test.skip("Customers tem o botao Banir, que pede confirmacao antes de banir", async () => {})

  test("/admin/customers redireciona para /admin/usuarios", async ({ page }) => {
    await preparar(page)
    await page.goto("/admin/customers")
    await expect(page).toHaveURL(/\/admin\/usuarios$/)
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

  test("Freemium lista e desbloquear pede confirmacao", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/freemium")
    await expect(page.getByText("beef56781234…")).toBeVisible()
    await page.getByRole("button", { name: "Desbloquear" }).click()
    await expect(page.getByText("Desbloquear freemium?")).toBeVisible()
    expect(escritas()).toHaveLength(0)
  })

  test("Usuarios: filtro Papel envia papel= e a lista aparece", async ({ page }) => {
    const { ultima } = await preparar(page)
    await page.goto("/admin/usuarios")
    await expect(page.getByText("ana@exemplo.com")).toBeVisible()
    await page.getByLabel("Papel").selectOption("ADMIN")
    await expect.poll(() => ultima("/api/admin/usuarios")?.query.get("papel")).toBe("ADMIN")
  })

  test("acoes de usuario: toda destrutiva pede confirmacao e excluir exige o e-mail", async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto("/admin/usuarios")
    await page.getByRole("button", { name: "Detalhes" }).click()
    const drawer = page.getByRole("dialog", { name: "Detalhes do usuário" })

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
      "DELETE /api/admin/usuarios/7",
    ])
  })
})
