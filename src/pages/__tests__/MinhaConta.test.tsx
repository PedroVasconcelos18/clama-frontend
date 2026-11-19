import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import MinhaConta from "@/pages/MinhaConta"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { formatCurrency } from "@/lib/formatters"
import { mockApiFetch, usuarioFixture } from "@/test/sessao"

vi.mock("@/components/clama/SiteHeader", () => ({ SiteHeader: () => null }))

const PENDENTE = "aaaaaaaa-0000-0000-0000-000000000001"
const PEDIDOS = [
  {
    id: PENDENTE,
    status: "AGUARDANDO_PAGAMENTO",
    plano: "Livre",
    valorCentavos: 2500,
    gratuito: false,
    criadoEm: "2026-11-10T15:00:00Z",
    tema: "luto",
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000002",
    status: "ENVIADA",
    plano: "Gratuito",
    valorCentavos: 0,
    gratuito: true,
    criadoEm: "2026-11-09T15:00:00Z",
    oracaoGerada: "Senhor, ouve.",
    tema: null,
  },
]

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (c: number) => new RegExp(formatCurrency(c).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"))

function abrir() {
  return render(
    <MemoryRouter initialEntries={["/conta"]}>
      <SessaoProvider>
        <MinhaConta />
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe("MinhaConta — histórico", () => {
  afterEach(() => vi.restoreAllMocks())

  it("lista /api/conta/pedidos com o valor formatado e 'Ver Pix' só no que aguarda pagamento", async () => {
    const spy = mockApiFetch({
      usuario: usuarioFixture,
      outras: (path) => (path === "/api/conta/pedidos" ? PEDIDOS : []),
    })
    abrir()
    expect(await screen.findByText(moeda(2500))).toBeInTheDocument()
    expect(screen.getByText("Oração gratuita")).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: /Ver Pix/ })
    expect(links).toHaveLength(1)
    expect(links[0]!.getAttribute("href")).toBe(`/confirmacao?pedido_id=${PENDENTE}`)
    expect(screen.queryByText(/WhatsApp|E-mail$/)).toBeNull() // sem canal (D5)
    await waitFor(() => expect(spy.mock.calls.map((c) => c[0])).toContain("/api/conta/pedidos"))
  })

  it("lista os comentários do blog e só apaga depois de confirmar", async () => {
    let itens = [{ id: 5, conteudo: "amém, irmãos", postSlug: "p", postTitulo: "Um post", postUrl: "https://blog/p/", criadoEm: "2026-11-01T10:00:00Z" }]
    const spy = mockApiFetch({
      usuario: usuarioFixture,
      outras: (path, init) => {
        if (path === "/api/conta/comentarios/5" && init?.method === "DELETE") {
          itens = []
          return null
        }
        if (path.startsWith("/api/conta/comentarios"))
          return { content: itens, page: { number: 0, size: 50, totalElements: itens.length, totalPages: 1 } }
        return []
      },
    })
    abrir()
    expect(await screen.findByText("Seus comentários no blog")).toBeInTheDocument()
    expect(screen.getByText("amém, irmãos")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Apagar" }))
    expect(spy.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false)
    await userEvent.click(await screen.findByRole("button", { name: "Apagar comentário" }))
    await waitFor(() => expect(screen.queryByText("Seus comentários no blog")).toBeNull())
    expect(spy.mock.calls.some(([p, i]) => p === "/api/conta/comentarios/5" && i?.method === "DELETE")).toBe(true)
  })

  it("o título é Sua jornada, com Meus clamores, o rótulo do tema e a oração de quem está ENVIADA", async () => {
    mockApiFetch({
      usuario: usuarioFixture,
      outras: (path) => (path === "/api/conta/pedidos" ? PEDIDOS : []),
    })
    abrir()
    expect(await screen.findByRole("heading", { level: 1, name: /Sua jornada/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Meus clamores" })).toBeInTheDocument()
    expect(await screen.findByText("Luto")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Ver oração/ }))
    expect(screen.getByText("Senhor, ouve.")).toBeInTheDocument()
  })

  it("não há aba Novo pedido: há um link Fazer um clamor para /", async () => {
    mockApiFetch({
      usuario: usuarioFixture,
      outras: (path) => (path === "/api/conta/pedidos" ? PEDIDOS : []),
    })
    abrir()
    await screen.findByText("Luto")
    expect(screen.queryByRole("tab")).toBeNull()
    expect(screen.queryByText("Novo pedido")).toBeNull()
    expect(screen.getByRole("link", { name: /Fazer um clamor/ })).toHaveAttribute("href", "/")
  })
})
