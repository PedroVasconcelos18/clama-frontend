import { test, expect, type Page } from "@playwright/test"

/**
 * Etapa 7 do admin, com a API inteira mockada (nenhum back no ar).
 * Rodar: `npm run dev` à parte e `BASE_URL=http://localhost:5173 npm run test:e2e -- tests/e2e/admin-etapa-7.spec.ts`.
 * Pedidos, eventos do MP e repasses saíram daqui na onda 4a (`pedido.spec.ts`); o blog, na onda 6 (`blog.spec.ts`), contra o backend real.
 */

type Chamada = { method: string; path: string; query: URLSearchParams; body: unknown }

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
    const conhecidas: Record<string, string> = {}
    if (method !== "GET") {
      if (`${method} ${path}` in conhecidas) return route.fulfill({ status: 204 })
      desconhecidas.push(`escrita ${method} ${path}`)
      return json({ detail: "sem mock" }, 500)
    }
    if (path === "/api/admin/usuarios") return json(paginaUsuarios([USUARIO]))
    if (path === "/api/admin/usuarios/7") return json(USUARIO)
    // a ficha mostra o blog do usuário (onda 6): vazio
    if (path === "/api/admin/blog/comentarios" || path === "/api/admin/blog/banimentos") return json(paginaUsuarios([]))
    if (path === "/api/admin/freemium/bloqueios") return json(paginaUsuarios([BLOQUEIO]))
    desconhecidas.push(`leitura GET ${path}`)
    return json({ detail: "sem mock" }, 500)
  })
  const escritas = () => chamadas.filter((c) => c.method !== "GET")
  const ultima = (path: string) => chamadas.filter((c) => c.method === "GET" && c.path === path).at(-1)
  return { chamadas, escritas, ultima }
}

test.describe("Admin, etapa 7 (API mockada)", () => {
  test("/admin/customers redireciona para /admin/usuarios", async ({ page }) => {
    await preparar(page)
    await page.goto("/admin/customers")
    await expect(page).toHaveURL(/\/admin\/usuarios$/)
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

  test("acoes de usuario: toda destrutiva pede confirmacao e a exclusao e pela tela LGPD", async ({ page }) => {
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

    // excluir saiu da ficha: o atalho leva à tela LGPD com o e-mail no state, nunca na URL
    await drawer.getByRole("button", { name: "Dados do titular (LGPD)" }).click()
    await expect(page).toHaveURL(/\/admin\/lgpd$/)
    await expect(page.getByLabel("E-mail do titular")).toHaveValue("ana@exemplo.com")
    expect(page.url()).not.toContain("ana")
    expect(escritas()).toHaveLength(0)
  })
})
