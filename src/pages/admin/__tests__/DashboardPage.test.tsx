import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import DashboardPage from "../DashboardPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))

const mostrar = (situacoes: string[]) => {
  fetchApi.mockReset().mockResolvedValue(situacoes.map((situacao, i) => ({ nome: `t${i}`, situacao })))
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

describe("DashboardPage", () => {
  beforeEach(() => fetchApi.mockReset())

  it("tudo em dia, sem chamar as rotas de métricas que não existem", async () => {
    mostrar(["ok", "ok"])
    expect(await screen.findByText("Tarefas: tudo em dia")).toBeTruthy()
    expect(fetchApi.mock.calls.map((c) => c[0])).toEqual(["/api/admin/tarefas"])
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
})
