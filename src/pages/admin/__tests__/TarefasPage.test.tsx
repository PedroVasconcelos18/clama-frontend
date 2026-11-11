import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import TarefasPage from "../TarefasPage"
import { PastoralApiError } from "@/lib/api"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = { cron: "0 0 10 28 * *", simulacaoConfigurada: false, proximaExecucao: "2026-11-28T13:00:00Z", rodandoAgora: false, falhasSeguidas: 0 }
let post: () => Promise<unknown>

describe("TarefasPage", () => {
  beforeEach(() => {
    post = () => Promise.resolve({})
    fetchApi.mockReset().mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return post()
      if (url === "/api/admin/tarefas")
        return Promise.resolve([
          { ...base, nome: "boa", situacao: "ok", ultima: { inicio: "2026-11-01T13:00:00Z", ok: true, simulacao: false, manual: false, resumo: "3 instituições" } },
          { ...base, nome: "sumida", situacao: "nao_agendada", proximaExecucao: null },
          { ...base, nome: "lenta", situacao: "atrasada", rodandoAgora: true },
          { ...base, nome: "quebrada", situacao: "falhou", falhasSeguidas: 2, ultima: { inicio: "2026-11-01T13:00:00Z", ok: false, simulacao: false, manual: false, erro: "X" } },
        ])
      const pagina = url.includes("page=1") ? [{ id: 9, inicio: "2026-10-01T13:00:00Z", ok: true, simulacao: true, manual: true, resumo: "pagina dois" }]
        : [{ id: 1, inicio: "2026-11-01T13:00:00Z", ok: true, simulacao: true, manual: true, resumo: "simulado ok" }]
      return Promise.resolve({ content: pagina, page: { number: 0, size: 20, totalElements: 25, totalPages: 2 } })
    })
  })

  it("destaca nao_agendada, atrasada e falhou, e marca a que está rodando", async () => {
    render(<TarefasPage />)
    const sumida = await screen.findByRole("region", { name: "sumida" })
    expect(within(sumida).getByText("Não agendada")).toBeTruthy()
    expect(within(sumida).getByText("O agendador não está rodando esta tarefa.")).toBeTruthy()
    const lenta = screen.getByRole("region", { name: "lenta" })
    expect(within(lenta).getByText("Atrasada")).toBeTruthy()
    expect(within(lenta).getByText("Rodando agora")).toBeTruthy()
    expect(within(screen.getByRole("region", { name: "quebrada" })).getByText("Falhou")).toBeTruthy()
    const boa = screen.getByRole("region", { name: "boa" })
    expect(within(boa).getByText("Em dia")).toBeTruthy()
    expect(within(boa).getByText(/0 0 10 28 \* \*/)).toBeTruthy()
    expect(within(boa).queryByText("Rodando agora")).toBeNull()
    expect(sumida.className).toMatch(/red/)
    expect(boa.className).not.toMatch(/red/)
  })

  it("Rodar agora vem com Só simular marcado e manda simulacao=true", async () => {
    render(<TarefasPage />)
    await userEvent.click(within(await screen.findByRole("region", { name: "boa" })).getByRole("button", { name: "Rodar agora" }))
    expect((screen.getByLabelText("Só simular") as HTMLInputElement).checked).toBe(true)
    await userEvent.click(screen.getByRole("button", { name: "Simular" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/tarefas/boa/execucoes", {
        method: "POST", body: JSON.stringify({ simulacao: true }), showToast: false }))
  })

  it("desmarcar Só simular manda simulacao=false; 409 mostra a mensagem", async () => {
    post = () => Promise.reject(new PastoralApiError("Erro", "tarefa_na_fila", "Essa tarefa já está na fila.", 409))
    render(<TarefasPage />)
    await userEvent.click(within(await screen.findByRole("region", { name: "boa" })).getByRole("button", { name: "Rodar agora" }))
    await userEvent.click(screen.getByLabelText("Só simular"))
    await userEvent.click(screen.getByRole("button", { name: "Rodar de verdade" }))
    expect(await screen.findByText("Essa tarefa já está na fila.")).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/tarefas/boa/execucoes", expect.objectContaining({ body: JSON.stringify({ simulacao: false }) }))
  })

  it("histórico é paginado", async () => {
    render(<TarefasPage />)
    await userEvent.click(within(await screen.findByRole("region", { name: "boa" })).getByRole("button", { name: "Histórico" }))
    expect(await screen.findByText(/simulado ok/)).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/tarefas/boa/execucoes?page=0&size=20")
    await userEvent.click(screen.getByRole("button", { name: /Próxima/ }))
    expect(await screen.findByText(/pagina dois/)).toBeTruthy()
  })
})
