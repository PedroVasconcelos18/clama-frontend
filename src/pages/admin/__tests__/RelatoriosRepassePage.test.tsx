import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import RelatoriosRepassePage from "../RelatoriosRepassePage"
import { PastoralApiError } from "@/lib/api"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const previa = {
  instituicao: "Associação Teste", de: "2026-10-28", ate: "2026-11-27", quantidade: 2,
  totalDoadoCentavos: 200, totalRepasseCentavos: 40, pendentes: 2, totalPendenteCentavos: 40,
  linhas: [{ data: "2026-11-02", doador: "Maria S.", referencia: "#abcd…1234", valorDoadoCentavos: 100, percentual: 20, valorRepasseCentavos: 20, status: "REGISTRADO" }],
}
let lote: () => Promise<unknown>
let mensais: Record<string, unknown>[]
let auditoria: unknown

describe("RelatoriosRepassePage", () => {
  beforeEach(() => {
    lote = () => Promise.resolve({ quantidade: 2, totalCentavos: 40 })
    mensais = []
    auditoria = { achados: [], criticos: 0, emJogoCentavos: 0 }
    fetchApi.mockReset().mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return lote()
      if (url === "/api/admin/instituicoes")
        return Promise.resolve([{ id: 7, nome: "Associação Teste", ativo: true }, { id: 8, nome: "Antiga", ativo: false }])
      if (url.startsWith("/api/admin/repasses/relatorio?")) return Promise.resolve(previa)
      if (url === "/api/admin/repasses/auditoria") return Promise.resolve(auditoria)
      return Promise.resolve({ content: mensais, page: { number: 0, size: 20, totalElements: mensais.length, totalPages: 1 } })
    })
  })

  const escolher = async () => {
    render(<RelatoriosRepassePage />)
    await userEvent.selectOptions(await screen.findByLabelText("Instituição"), "7")
  }

  it("inclui inativas e, no período padrão, pede o relatório sem datas (a API resolve o ciclo)", async () => {
    await escolher()
    expect(screen.getByRole("option", { name: "Antiga (inativa)" })).toBeTruthy()
    await screen.findByText(/TOTAL \(2 doações\)/)
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/repasses/relatorio?instituicaoId=7", { showToast: false })
    expect(screen.getByText(/período 28\/10\/2026 a 27\/11\/2026/)).toBeTruthy()
    expect(screen.getByText("Maria S.")).toBeTruthy()
  })

  it("mês e datas mudam a consulta; datas só consultam com as duas", async () => {
    await escolher()
    await userEvent.selectOptions(screen.getByLabelText("Período"), "mes")
    await userEvent.type(screen.getByLabelText("Mês"), "2026-10")
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith("/api/admin/repasses/relatorio?instituicaoId=7&mes=2026-10", { showToast: false }))
    await userEvent.selectOptions(screen.getByLabelText("Período"), "datas")
    await userEvent.type(screen.getByLabelText("De"), "2026-11-01")
    expect(fetchApi).not.toHaveBeenCalledWith(expect.stringContaining("de=2026-11-01"), expect.anything())
    await userEvent.type(screen.getByLabelText("Até"), "2026-11-05")
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/repasses/relatorio?instituicaoId=7&de=2026-11-01&ate=2026-11-05", { showToast: false }))
  })

  it("o CSV da instituição é um link de download; o interno só depois do aviso", async () => {
    await escolher()
    const csv = await screen.findByRole("link", { name: "Baixar CSV da instituição" })
    expect(csv.getAttribute("href")).toBe("/api/admin/repasses/relatorio.csv?instituicaoId=7")
    expect(csv.hasAttribute("download")).toBe(true)
    expect(screen.queryByRole("link", { name: /Entendi/ })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Baixar auditoria interna" }))
    expect(screen.getByText("USO INTERNO")).toBeTruthy()
    expect(screen.getByText(/Não entregar à instituição/)).toBeTruthy()
    const interno = screen.getByRole("link", { name: /Entendi/ })
    expect(interno.getAttribute("href")).toBe("/api/admin/repasses/relatorio-interno.csv?instituicaoId=7")
  })

  it("quitação em lote manda a quantidade da prévia, com comprovante", async () => {
    await escolher()
    await userEvent.click(await screen.findByRole("button", { name: "Marcar 2 pendentes como transferidos" }))
    const confirmar = screen.getByRole("button", { name: "Confirmar transferência" }) as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    await userEvent.type(screen.getByLabelText("Comprovante"), " PIX-1 ")
    await userEvent.click(confirmar)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/repasses/transferencias", {
        method: "POST", showToast: false,
        body: JSON.stringify({ instituicaoId: 7, de: "2026-10-28", ate: "2026-11-27", comprovante: "PIX-1", quantidade: 2 }),
      }))
  })

  it("409 no lote mostra a mensagem da API e mantém o diálogo", async () => {
    lote = () => Promise.reject(new PastoralApiError("Erro", "recorte_mudou", "Os repasses do período mudaram desde a prévia.", 409))
    await escolher()
    await userEvent.click(await screen.findByRole("button", { name: "Marcar 2 pendentes como transferidos" }))
    await userEvent.type(screen.getByLabelText("Comprovante"), "PIX-1")
    await userEvent.click(screen.getByRole("button", { name: "Confirmar transferência" }))
    expect(await screen.findByText("Os repasses do período mudaram desde a prévia.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Confirmar transferência" })).toBeTruthy()
  })

  it("Conferir ledger: consistente e com achados", async () => {
    render(<RelatoriosRepassePage />)
    await userEvent.click(screen.getByRole("button", { name: "Conferir ledger" }))
    expect(await screen.findByText(/Ledger consistente/)).toBeTruthy()
    auditoria = { criticos: 1, emJogoCentavos: 500, achados: [{ gravidade: "CRITICO", tipo: "orfao", detalhe: "sem repasse", valorEmJogoCentavos: 500 }] }
    await userEvent.click(screen.getByRole("button", { name: "Conferir ledger" }))
    expect(await screen.findByText(/sem repasse/)).toBeTruthy()
    expect(screen.getByText("Crítico")).toBeTruthy()
  })

  it("lista os ciclos gerados e marca o que mudou desde a geração", async () => {
    mensais = [
      { id: 1, instituicao: "A", de: "2026-09-28", ate: "2026-10-27", geradoEm: "2026-10-28T13:00:00Z", quantidade: 3, totalRepasseCentavos: 100, totalAgoraCentavos: 100 },
      { id: 2, instituicao: "B", de: "2026-09-28", ate: "2026-10-27", geradoEm: "2026-10-28T13:00:00Z", quantidade: 3, totalRepasseCentavos: 100, totalAgoraCentavos: 70 },
    ]
    render(<RelatoriosRepassePage />)
    expect(await screen.findAllByText(/mudou desde a geração/)).toHaveLength(1)
    expect(screen.getByText("igual ao gerado")).toBeTruthy()
  })
})
