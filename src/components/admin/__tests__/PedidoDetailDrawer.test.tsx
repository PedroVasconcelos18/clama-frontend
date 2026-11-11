import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PedidoDetailDrawer } from "../PedidoDetailDrawer"
import { formatCurrency } from "@/lib/formatters"

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (c: number) => new RegExp(formatCurrency(c).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"))

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ID = "12345678-aaaa-bbbb-cccc-1234567890ab"
const detalhe = {
  id: ID, status: "ERRO", gratuito: false, valorCentavos: 3001, usuarioId: null,
  nome: "Ana", email: "ana@x.com", telefone: null, idade: 30, sexo: "feminino",
  pedidoOracao: "Pela família", oracaoGerada: null,
  criadoEm: "2026-11-01T13:00:00Z", atualizadoEm: "2026-11-01T13:05:00Z",
  plano: { id: 4, nome: "Livre", valorCentavos: 100 },
  instituicao: { id: 7, nome: "Casa de Apoio" },
  tentativas: 2, ultimoErro: "credit_balance",
  cobrancas: [
    { n: 1, status: "EXPIRADA", criadaEm: "2026-11-01T13:00:00Z", expiraEm: "2026-11-02T13:00:00Z", mpPagamentoId: 111 },
    { n: 2, status: "PAGA", criadaEm: "2026-11-02T14:00:00Z", pagaEm: "2026-11-02T14:01:00Z", mpPagamentoId: 222 },
  ],
  repasse: { id: 9, status: "REGISTRADO", valorCentavos: 600, valorBaseCentavos: 3001, percentual: 20, criadoEm: "2026-11-02T14:01:00Z" },
  eventos: [{ id: 5, tipo: "payment", status: "PROCESSADO", motivo: null, recebidoEm: "2026-11-02T14:01:00Z" }],
}

describe("PedidoDetailDrawer", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockResolvedValue(detalhe)
  })

  it("mostra dados, plano, instituição, cobranças, repasse, eventos e último erro", async () => {
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    expect(await screen.findByText("ana@x.com")).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith(`/api/admin/pedidos/${ID}`)
    expect(screen.getByText("Casa de Apoio")).toBeTruthy()
    expect(screen.getByText(moeda(3001))).toBeTruthy()
    expect(screen.getByText("#2 · PAGA")).toBeTruthy()
    expect(screen.getByText("#1 · EXPIRADA")).toBeTruthy()
    expect(screen.getByText(/MP 222/)).toBeTruthy()
    expect(screen.getByText(/REGISTRADO/)).toBeTruthy()
    expect(screen.getByText(moeda(600))).toBeTruthy()
    expect(screen.getByText("credit_balance")).toBeTruthy()
    expect(screen.getByText(/Tentativas: 2/)).toBeTruthy()
    expect(screen.getByText("payment · PROCESSADO")).toBeTruthy()
  })

  it("sem gratuidade, reenvio, regeneração nem canal (4b e D5)", async () => {
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await screen.findByText("ana@x.com")
    expect(screen.queryByRole("button", { name: /gratuito/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /Reenviar/i })).toBeNull()
    expect(screen.queryByText(/Canal/)).toBeNull()
  })

  it("Editar abre o formulário só de dados", async () => {
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Editar/ }))
    expect(screen.getByLabelText("Nome")).toBeTruthy()
    expect(screen.queryByLabelText("Status")).toBeNull()
  })
})
