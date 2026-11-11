import { test, expect, type Browser, type Page } from "@playwright/test"

/**
 * Blog contra o backend REAL, com o WordPress simulado por WireMock (suporte/wordpress) e o widget REAL do WordPress
 * (suporte/widget/index.js, cópia do bundle; o shim põe o React 19 no lugar de `wp.element`).
 * Rodar: `MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/blog.spec.ts`.
 *
 * `/blog/<slug>` é servido por `page.route`: o blog de verdade é o WordPress, que não sobe aqui. A página tem só o que
 * o tema entrega ao widget: a âncora, o `clamaWidget` e os dois scripts. Slugs: `post-de-teste` é publicado no WireMock;
 * `post-que-saiu` não existe no WordPress (lista vazia).
 */

const SENHA = "Senha-de-teste-123"
const SUPER = "super@clama.test"
const CLIENTE = "cliente@clama.test"
const POST = "post-de-teste"
const POST_FORA = "post-que-saiu"
const COMENTARIO = "Que este texto me tocou de verdade, amém."
const CURTO = "Esse comentário precisa de um pouquinho mais de texto pra ser publicado."
const SUSPENSA = "Sua conta foi suspensa do sistema de comentários."
const FORA_DO_AR = "Não encontramos este texto. Ele pode ter saído do ar."

test.describe.configure({ mode: "serial" })

/** O que o tema do WordPress monta: a âncora, o `clamaWidget` (`apiBase` vazio = mesma origem) e os scripts, shim primeiro. */
async function servirPosts(page: Page) {
  await page.route(/\/blog\/(post-de-teste|post-que-saiu)$/, (route) => {
    const slug = new URL(route.request().url()).pathname.split("/").pop()!
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${slug}</title></head>
<body style="background:#111;color:#eee"><main><h1>${slug}</h1>
<div id="clama-widget-engajamento" data-post-slug="${slug}"></div></main>
<script>window.clamaWidget = { apiBase: "", postSlug: "${slug}", wpPostId: 9001, loginUrl: "/login" }</script>
<script type="module" src="/tests/e2e/suporte/widget/shim.ts"></script>
<script type="module" src="/tests/e2e/suporte/widget/index.js"></script></body></html>`,
    })
  })
}

async function entrar(page: Page, rota: string, email: string) {
  await page.goto(rota)
  const botao = page.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled() // habilita quando a sessão do boot carregou
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill(SENHA)
  await botao.click()
}

async function paginaDeAdmin(browser: Browser) {
  const contexto = await browser.newContext({ baseURL: process.env.BASE_URL })
  const page = await contexto.newPage()
  await entrar(page, "/admin/login", SUPER)
  await expect(page).toHaveURL(/\/admin$/)
  return page
}

/**
 * Abre o post e espera o widget montar. O Vite em dev otimiza o React na 1ª vez que o shim o pede e responde "dep
 * desatualizada" a quem chegou antes: se o widget não monta, recarrega (a 2ª já vem otimizada).
 */
async function abrirPost(page: Page, slug: string) {
  await expect(async () => {
    await page.goto(`/blog/${slug}`)
    await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
}

const curtir = (page: Page) => page.locator('[data-slot="like-button"]')
const caixa = (page: Page) => page.getByLabel("Seu comentário")
const comentarios = (page: Page) => page.locator('[data-slot="comment-item"]')

let admin: Page

test.afterAll(async () => {
  await admin?.context().close()
})

test("1. anônimo vê Comentários, lista vazia e traço na curtida", async ({ page }) => {
  await servirPosts(page)
  await abrirPost(page, POST)
  await expect(comentarios(page)).toHaveCount(0)
  await expect(curtir(page)).toContainText("—")
})

test("2. anônimo que curte é levado ao login com o caminho do post", async ({ page }) => {
  await servirPosts(page)
  await abrirPost(page, POST)
  await curtir(page).click()
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/blog/${POST}`)}$`))
})

test("3. o cliente entra, volta ao post, curte e descurte", async ({ page }) => {
  await servirPosts(page)
  await abrirPost(page, POST)
  await curtir(page).click()
  await expect(page).toHaveURL(/\/login\?next=/)
  const botao = page.getByRole("button", { name: "Entrar" })
  await expect(botao).toBeEnabled()
  await page.getByLabel("E-mail").fill(CLIENTE)
  await page.getByLabel("Senha", { exact: true }).fill(SENHA)
  await botao.click()
  await expect(page).toHaveURL(new RegExp(`/blog/${POST}$`))
  await curtir(page).click()
  await expect(curtir(page)).toContainText("1")
  await expect(curtir(page)).toHaveAttribute("aria-pressed", "true")
  await curtir(page).click()
  await expect(curtir(page)).toContainText("0")
  await expect(curtir(page)).toHaveAttribute("aria-pressed", "false")
})

test("4. comentário curto é recusado; um válido aparece com o nome público", async ({ page }) => {
  await servirPosts(page)
  await entrar(page, "/login", CLIENTE)
  await expect(page).toHaveURL(/\/conta$/)
  await abrirPost(page, POST)
  await caixa(page).fill("oi")
  await page.getByRole("button", { name: "Publicar" }).click()
  await expect(page.getByText(CURTO)).toBeVisible()
  await caixa(page).fill(COMENTARIO)
  await page.getByRole("button", { name: "Publicar" }).click()
  await expect(comentarios(page)).toHaveCount(1)
  await expect(comentarios(page).first()).toContainText(COMENTARIO)
  await expect(comentarios(page).first()).toContainText("Cliente")
})

test("5. o admin bane o autor, com motivo obrigatório", async ({ browser }) => {
  admin = await paginaDeAdmin(browser)
  await admin.goto("/admin/blog/comentarios")
  const linha = admin.getByRole("row", { name: new RegExp(COMENTARIO) })
  await expect(linha).toBeVisible()
  await expect(admin.getByRole("columnheader", { name: /^IP$/ })).toHaveCount(0)
  await linha.getByRole("button", { name: "Banir" }).click()
  const confirmar = admin.getByRole("dialog").getByRole("button", { name: "Banir" })
  await expect(confirmar).toBeDisabled()
  await admin.getByLabel(/Motivo/).fill("ofensa no e2e")
  await confirmar.click()
  await expect(admin.getByText("Autor banido do sistema de comentários.")).toBeVisible()
})

test("6. banido, o cliente comenta e vê a suspensão, com o texto preservado", async ({ page }) => {
  await servirPosts(page)
  await entrar(page, "/login", CLIENTE)
  await expect(page).toHaveURL(/\/conta$/)
  await abrirPost(page, POST)
  await caixa(page).fill("Mais um comentário que não vai passar.")
  await page.getByRole("button", { name: "Publicar" }).click()
  const fechado = page.locator('[data-slot="comment-form-fechado"]')
  await expect(fechado).toContainText(SUSPENSA)
  await expect(fechado).toContainText("Mais um comentário que não vai passar.")
})

test("7. o admin revoga o ban e apaga o comentário; o widget não o mostra mais", async ({ page }) => {
  await admin.goto("/admin/blog/banidos")
  await expect(admin.getByText("ofensa no e2e")).toBeVisible()
  await admin.getByRole("button", { name: "Revogar" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Revogar" }).click()
  await expect(admin.getByText("Nenhum usuário banido no momento.")).toBeVisible()

  await admin.goto("/admin/blog/comentarios")
  await admin.getByRole("row", { name: new RegExp(COMENTARIO) }).getByRole("button", { name: "Excluir" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Excluir" }).click()
  await expect(admin.getByText("Nenhum comentário com esse filtro.")).toBeVisible()

  await servirPosts(page)
  await abrirPost(page, POST)
  await expect(comentarios(page)).toHaveCount(0)
})

test("8. num slug que o WordPress não tem publicado, comentar mostra que saiu do ar", async ({ page }) => {
  await servirPosts(page)
  await entrar(page, "/login", CLIENTE)
  await expect(page).toHaveURL(/\/conta$/)
  await abrirPost(page, POST_FORA)
  await caixa(page).fill("Comentando num texto que não existe mais.")
  await page.getByRole("button", { name: "Publicar" }).click()
  await expect(page.getByText(FORA_DO_AR)).toBeVisible()
})
