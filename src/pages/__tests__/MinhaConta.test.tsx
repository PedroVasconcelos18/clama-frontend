import { render, screen, waitFor } from "@testing-library/react"
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
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000002",
    status: "ENVIADA",
    plano: "Gratuito",
    valorCentavos: 0,
    gratuito: true,
    criadoEm: "2026-11-09T15:00:00Z",
    oracaoGerada: "Senhor, ouve.",
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
})
