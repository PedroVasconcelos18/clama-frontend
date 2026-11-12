import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import DashboardPage from "../DashboardPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))

const PEDIDOS = {
  criados: 9, pagos: 5, gratuitos: 3, enviados: 4, emErroAgora: 2, faturamentoCentavos: 12500, ticketMedioCentavos: 2500,
  porPlano: [{ plano: "Livre", quantidade: 5, faturamentoCentavos: 12500 }],
  latencia: { p50Segundos: 30, p90Segundos: 150 },
}
const ORACAO = {
  geracoes: 7, tokensEntrada: 1000, tokensSaida: 2000, tokensCacheEscrita: 300, tokensCacheLeitura: 400,
  custoEstimadoUsd: 1.5, duracao: { p50Ms: 4000, p90Ms: 9000 },
}

const mostrar = (situacoes: string[], oracao: object = ORACAO) => {
  fetchApi.mockReset().mockImplementation(async (path: string) => {
    if (path.startsWith("/api/admin/tarefas")) return situacoes.map((situacao, i) => ({ nome: `t${i}`, situacao }))
    if (path.startsWith("/api/admin/metricas/pedidos")) return PEDIDOS
    return oracao
  })
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

describe("DashboardPage", () => {
  beforeEach(() => {
    fetchApi.mockReset()
  })

  it("tudo em dia", async () => {
    mostrar(["ok", "ok"])
    expect(await screen.findByText("Tarefas: tudo em dia")).toBeTruthy()
  })

  it("conta as tarefas com problema e leva a /admin/tarefas", async () => {
    mostrar(["ok", "falhou", "atrasada", "nao_agendada"])
    const link = await screen.findByRole("link", { name: "Tarefas: 3 com problemas" })
    expect(link.getAttribute("href")).toBe("/admin/tarefas")
  })

  it("uma só com problema fica no singular", async () => {
    mostrar(["falhou"])
    expect(await screen.findByText("Tarefas: 1 com problema")).toBeTruthy()
  })

  it("cartões de pedido, por plano, latência e oração; erro leva à lista filtrada", async () => {
    mostrar(["ok"])
    expect(await screen.findByText("Pagos")).toBeTruthy()
    expect(screen.getByText("Faturamento").nextSibling?.textContent).toMatch(/R\$\s*125,00/)
    expect(screen.getByText("Ticket médio").nextSibling?.textContent).toMatch(/R\$\s*25,00/)
    expect(screen.getByText(/Livre: 5/)).toBeTruthy()
    expect(screen.getByText("30 s / 2,5 min")).toBeTruthy()
    expect(screen.getByText("1.000 / 2.000")).toBeTruthy()
    expect(screen.getByText("US$ 1.5000")).toBeTruthy()
    expect(screen.getByText("4,0 s / 9,0 s")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Em erro agora: 2" }).getAttribute("href")).toBe("/admin/pedidos?status=ERRO")
  })

  it("custo nulo aparece como traço, não como zero", async () => {
    mostrar(["ok"], { ...ORACAO, custoEstimadoUsd: null })
    await screen.findByText("Custo estimado")
    expect(screen.getByText("Custo estimado").nextSibling?.textContent).toBe("—")
  })

  it("período padrão é o mês corrente e mudar as datas refaz a consulta", async () => {
    mostrar(["ok"])
    await screen.findByText("Pagos")
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const primeira = fetchApi.mock.calls.find(([p]) => String(p).startsWith("/api/admin/metricas/pedidos"))![0]
    expect(primeira).toBe(`/api/admin/metricas/pedidos?de=${hoje.slice(0, 8)}01&ate=${hoje}`)
    const de = screen.getByLabelText("De") as HTMLInputElement
    await userEvent.clear(de)
    await userEvent.type(de, `${hoje.slice(0, 5)}01-01`)
    await waitFor(() =>
      expect(fetchApi.mock.calls.some(([p]) => p === `/api/admin/metricas/pedidos?de=${hoje.slice(0, 5)}01-01&ate=${hoje}`)).toBe(true),
    )
  })
})
