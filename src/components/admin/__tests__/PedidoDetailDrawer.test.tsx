import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PedidoDetailDrawer } from "../PedidoDetailDrawer"
import { formatCurrency } from "@/lib/formatters"
import { PastoralApiError } from "@/lib/api"
import { toast } from "sonner"

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (c: number) => new RegExp(formatCurrency(c).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"))

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

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
    vi.mocked(toast.success).mockClear(); vi.mocked(toast.error).mockClear(); vi.mocked(toast.info).mockClear()
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

  const botoes = () => ({
    gratuidade: screen.queryByRole("button", { name: /Conceder gratuidade/ }),
    reenvio: screen.queryByRole("button", { name: /Reenviar oração/ }),
    regeneracao: screen.queryByRole("button", { name: /Regenerar oração/ }),
  })

  it.each([
    ["AGUARDANDO_PAGAMENTO", null, [true, false, false]],
    ["ERRO", null, [false, false, true]],
    ["ERRO", "Senhor...", [false, true, false]],
    ["ENVIADA", "Senhor...", [false, true, false]],
    ["PAGO", null, [false, false, false]],
  ])("botoes em %s com oracao %s (D10)", async (status, oracaoGerada, [g, r, rg]) => {
    fetchApi.mockResolvedValue({ ...detalhe, status, oracaoGerada })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await screen.findByText("ana@x.com")
    const b = botoes()
    expect([!!b.gratuidade, !!b.reenvio, !!b.regeneracao]).toEqual([g, r, rg])
    expect(screen.queryByText(/Canal/)).toBeNull()
  })

  it("Regenerar pede confirmacao, chama a API e le o detalhe de novo", async () => {
    const onChanged = vi.fn()
    fetchApi.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return { id: ID, status: "PAGO" }
      return fetchApi.mock.calls.some(([u]) => u === `/api/admin/pedidos/${ID}/regeneracao`)
        ? { ...detalhe, status: "PAGO", ultimoErro: null }
        : detalhe
    })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} onChanged={onChanged} />)
    await userEvent.click(await screen.findByRole("button", { name: /Regenerar oração/ }))
    expect(fetchApi).not.toHaveBeenCalledWith(`/api/admin/pedidos/${ID}/regeneracao`, expect.anything())
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(fetchApi).toHaveBeenCalledWith(`/api/admin/pedidos/${ID}/regeneracao`, expect.objectContaining({ method: "POST" }))
    expect(fetchApi.mock.calls.filter(([u]) => u === `/api/admin/pedidos/${ID}`)).toHaveLength(2)
    expect(toast.success).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("button", { name: /Regenerar oração/ })).toBeNull())
  })

  it("Cancelar na confirmacao nao chama a API", async () => {
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Regenerar oração/ }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(fetchApi).toHaveBeenCalledTimes(1)
  })

  it("409 pagamento_ja_aprovado vira toast pastoral", async () => {
    const msg = "O pagamento já foi aprovado."
    fetchApi.mockImplementation(async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") throw new PastoralApiError("Conflito", "pagamento_ja_aprovado", msg, 409)
      return { ...detalhe, status: "AGUARDANDO_PAGAMENTO" }
    })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Conceder gratuidade/ }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(msg))
  })

  const lidas = () => fetchApi.mock.calls.filter(([u]) => u === `/api/admin/pedidos/${ID}`).length

  it("409 de indisponibilidade tambem relê o detalhe, para os botoes refletirem o estado", async () => {
    let posted = false
    fetchApi.mockImplementation(async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") { posted = true; throw new PastoralApiError("Conflito", "regeneracao_indisponivel", "Indisponível.", 409) }
      return posted ? { ...detalhe, status: "PAGO" } : detalhe
    })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Regenerar oração/ }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Indisponível."))
    await waitFor(() => expect(screen.queryByRole("button", { name: /Regenerar oração/ })).toBeNull())
    expect(lidas()).toBe(2)
  })

  it("POST ok e GET falha: onChanged chamado, sem toast de falha da acao", async () => {
    const onChanged = vi.fn()
    let posted = false
    fetchApi.mockImplementation(async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") { posted = true; return { id: ID, status: "PAGO" } }
      if (posted) throw new Error("rede")
      return detalhe
    })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} onChanged={onChanged} />)
    await userEvent.click(await screen.findByRole("button", { name: /Regenerar oração/ }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    await waitFor(() => expect(lidas()).toBe(2))
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
  })

  it("reenvio com jaEmAndamento avisa que ja ha envio em andamento", async () => {
    fetchApi.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "POST" ? { id: ID, status: "ENVIADA", jaEmAndamento: true } : { ...detalhe, status: "ENVIADA", oracaoGerada: "Senhor..." })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Reenviar oração/ }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Já há um envio em andamento."))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("duplo clique em Confirmar chama o POST uma vez so", async () => {
    let solta: () => void = () => {}
    fetchApi.mockImplementation(async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") { await new Promise<void>((r) => { solta = r }); return { id: ID } }
      return detalhe
    })
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Regenerar oração/ }))
    const confirmar = screen.getByRole("button", { name: "Confirmar" })
    await userEvent.dblClick(confirmar)
    solta()
    await waitFor(() => expect(lidas()).toBe(2))
    expect(fetchApi.mock.calls.filter(([, i]) => i?.method === "POST")).toHaveLength(1)
  })

  it("Editar abre o formulário só de dados", async () => {
    render(<PedidoDetailDrawer pedidoId={ID} onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole("button", { name: /Editar/ }))
    expect(screen.getByLabelText("Nome")).toBeTruthy()
    expect(screen.queryByLabelText("Status")).toBeNull()
  })
})
