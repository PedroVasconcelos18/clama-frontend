import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PastoralApiError } from "@/lib/api"
import PlanosPage from "../PlanosPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const comum = {
  id: 1, nome: "Bênção", descricao: "Uma oração", valorCentavos: 2000,
  complexidade: "SIMPLES", tipo: "COMUM", ordem: 1, ativo: true,
}
const gratuito = { ...comum, id: 2, nome: "Gratuito", valorCentavos: 0, tipo: "GRATUITO", ordem: 0 }
const livre = { ...comum, id: 3, nome: "Livre", valorCentavos: 1, tipo: "VALOR_LIVRE", ordem: 9 }

const ultimaEscrita = () => fetchApi.mock.calls.filter(([, i]) => i?.method).at(-1)!

describe("PlanosPage", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockImplementation(async (_p: string, init?: RequestInit) =>
      init?.method ? comum : [comum, gratuito, livre],
    )
  })

  it("lista de /api/admin/planos, marca os do sistema e so eles", async () => {
    render(<PlanosPage />)
    expect(await screen.findByText("Bênção")).toBeTruthy()
    expect(fetchApi.mock.calls[0]![0]).toBe("/api/admin/planos")
    expect(screen.getAllByText("Do sistema")).toHaveLength(2)
    expect(screen.getByText("R$ 20,00")).toBeTruthy()
  })

  it("plano tecnico nao tem Desativar", async () => {
    render(<PlanosPage />)
    await screen.findByText("Bênção")
    expect(screen.getAllByRole("button", { name: "Desativar" })).toHaveLength(1)
  })

  it("cria plano comum com valor em reais convertido em centavos", async () => {
    render(<PlanosPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Novo Plano/ }))
    await userEvent.type(screen.getByLabelText("Nome"), "Novo")
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "12,34")
    await userEvent.type(screen.getByLabelText("Descrição"), "Desc")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(ultimaEscrita()).toBeTruthy())
    const [path, init] = ultimaEscrita()
    expect(path).toBe("/api/admin/planos")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toMatchObject({
      nome: "Novo", valorCentavos: 1234, descricao: "Desc", complexidade: "SIMPLES",
    })
  })

  it("plano tecnico: so nome e descricao editaveis, e salva sem validar o valor", async () => {
    render(<PlanosPage />)
    await screen.findByRole("heading", { name: "Gratuito" })
    const cartao = screen.getByRole("heading", { name: "Gratuito" }).closest("div.border") as HTMLElement
    await userEvent.click(cartao.querySelector("button")!)
    expect((screen.getByLabelText("Nome") as HTMLInputElement).disabled).toBe(false)
    expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).disabled).toBe(false)
    for (const l of ["Valor (R$)", "Complexidade", "Ordem"])
      expect((screen.getByLabelText(l) as HTMLInputElement).disabled).toBe(true)
    await userEvent.clear(screen.getByLabelText("Descrição"))
    await userEvent.type(screen.getByLabelText("Descrição"), "Nova desc")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(ultimaEscrita()).toBeTruthy())
    const [path, init] = ultimaEscrita()
    expect(path).toBe("/api/admin/planos/2")
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body).descricao).toBe("Nova desc")
  })

  it("desativar usa PATCH {ativo:false}", async () => {
    render(<PlanosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Desativar" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Desativar" }).at(-1)!)
    await waitFor(() => expect(ultimaEscrita()).toBeTruthy())
    const [path, init] = ultimaEscrita()
    expect(path).toBe("/api/admin/planos/1")
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ ativo: false })
  })

  it("erro por campo do servidor aparece embaixo do campo", async () => {
    fetchApi.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method) throw new PastoralApiError("Erro", "dados_invalidos", "Confira", 400, {}, { nome: "Já existe um plano ativo com esse nome." })
      return [comum]
    })
    render(<PlanosPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Novo Plano/ }))
    await userEvent.type(screen.getByLabelText("Nome"), "Bênção")
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "5")
    await userEvent.type(screen.getByLabelText("Descrição"), "d")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText("Já existe um plano ativo com esse nome.")).toBeTruthy()
  })
})
