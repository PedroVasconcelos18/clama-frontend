import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PastoralApiError } from "@/lib/api"
import PromptEditorPage from "../PromptEditorPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const conteudo = {
  sistema: "SISTEMA", simples: "SIMPLES", comVersiculo: "VERS", comProfeciaEVersiculos: "PROF", gratuito: "GRAT",
}
const padrao = { id: null, padrao: true, ativo: false, conteudo, criadoEm: null, criadoPor: null }
const v1 = { id: 7, padrao: false, ativo: true, conteudo: { ...conteudo, sistema: "SISTEMA V1" }, criadoEm: "2026-11-10T10:00:00Z", criadoPor: 1 }
const v2 = { id: 8, padrao: false, ativo: false, conteudo: { ...conteudo, sistema: "SISTEMA V2" }, criadoEm: "2026-11-11T10:00:00Z", criadoPor: 1 }

const escritas = () => fetchApi.mock.calls.filter(([, i]) => i?.method)
const linha = (t: string) => screen.getByText(t).closest("[data-versao]") as HTMLElement

describe("PromptEditorPage", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockImplementation(async (_p: string, init?: RequestInit) =>
      init?.method ? {} : [v2, v1, padrao],
    )
  })

  it("lista com Padrao no topo e a ativa destacada", async () => {
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    const linhas = document.querySelectorAll("[data-versao]")
    expect(linhas[0]!.textContent).toContain("Padrão")
    expect(linha("Versão 7").textContent).toContain("Ativa")
    expect(fetchApi.mock.calls[0]![0]).toBe("/api/admin/prompts")
  })

  it("salvar cria versao nova com os 5 campos", async () => {
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    await userEvent.click(within(linha("Versão 8")).getByRole("button", { name: "Editar a partir desta" }))
    expect((screen.getByLabelText("System prompt") as HTMLTextAreaElement).value).toBe("SISTEMA V2")
    await userEvent.click(screen.getByRole("button", { name: "Salvar nova versão" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    const [path, init] = escritas()[0]!
    expect([path, init.method]).toEqual(["/api/admin/prompts", "POST"])
    expect(JSON.parse(init.body)).toEqual({ ...conteudo, sistema: "SISTEMA V2" })
  })

  it("os 3 campos sem uso ganham o aviso e a previa nao tem seletor de complexidade", async () => {
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    expect(screen.getAllByText("Não usado desde a v2")).toHaveLength(3)
    await userEvent.click(within(linha("Padrão")).getByRole("button", { name: "Prévia" }))
    expect(within(screen.getByRole("dialog")).queryByRole("combobox")).toBeNull()
  })

  it("ativar pede confirmacao e chama /{id}/ativacao", async () => {
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    await userEvent.click(within(linha("Versão 8")).getByRole("button", { name: "Ativar" }))
    expect(escritas()).toHaveLength(0)
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Ativar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect([escritas()[0]![0], escritas()[0]![1].method]).toEqual(["/api/admin/prompts/8/ativacao", "POST"])
  })

  it("voltar ao padrao pede confirmacao e chama DELETE /ativacao", async () => {
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    await userEvent.click(within(linha("Padrão")).getByRole("button", { name: "Voltar ao padrão" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Voltar ao padrão" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect([escritas()[0]![0], escritas()[0]![1].method]).toEqual(["/api/admin/prompts/ativacao", "DELETE"])
  })

  it("previa envia versaoId e mostra a oracao", async () => {
    fetchApi.mockImplementation(async (p: string, init?: RequestInit) =>
      p.endsWith("/previa") ? { oracao: "Senhor, abençoa.", versaoId: 8 } : init?.method ? {} : [v2, v1, padrao])
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    await userEvent.click(within(linha("Versão 8")).getByRole("button", { name: "Prévia" }))
    await userEvent.clear(screen.getByLabelText("Nome")); await userEvent.type(screen.getByLabelText("Nome"), "Ana")
    await userEvent.clear(screen.getByLabelText("Pedido de exemplo")); await userEvent.type(screen.getByLabelText("Pedido de exemplo"), "Pela minha mãe")
    await userEvent.click(screen.getByRole("button", { name: "Gerar prévia" }))
    expect(await screen.findByText("Senhor, abençoa.")).toBeTruthy()
    expect(JSON.parse(escritas()[0]![1].body)).toMatchObject({ versaoId: 8, nome: "Ana", pedidoOracao: "Pela minha mãe" })
  })

  it("previa 503 mostra a mensagem pastoral", async () => {
    fetchApi.mockImplementation(async (p: string, init?: RequestInit) => {
      if (p.endsWith("/previa")) throw new PastoralApiError("Erro", "claude_indisponivel", "A oração está descansando.", 503)
      return init?.method ? {} : [v2, v1, padrao]
    })
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    await userEvent.click(within(linha("Padrão")).getByRole("button", { name: "Prévia" }))
    await userEvent.click(screen.getByRole("button", { name: "Gerar prévia" }))
    expect(await screen.findByText("A oração está descansando.")).toBeTruthy()
  })

  it("barra texto acima do limite no cliente", async () => {
    render(<PromptEditorPage />)
    await screen.findByText("Padrão")
    await userEvent.click(within(linha("Versão 8")).getByRole("button", { name: "Editar a partir desta" }))
    const campo = screen.getByLabelText("Instrução simples") as HTMLTextAreaElement
    expect(campo.maxLength).toBe(5000)
    expect((screen.getByLabelText("System prompt") as HTMLTextAreaElement).maxLength).toBe(50000)
  })
})
