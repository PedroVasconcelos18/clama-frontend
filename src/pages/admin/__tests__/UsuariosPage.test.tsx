import { MemoryRouter } from "react-router-dom"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import UsuariosPage from "../UsuariosPage"

const fetchApi = vi.fn()
let papelLogado = "SUPERUSUARIO"
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("@/contexts/SessaoContext", () => ({
  useSessao: () => ({ usuario: { id: 1, papel: papelLogado } }),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const pagina = (content: object[] = []) => ({
  content,
  page: { number: 0, size: 20, totalElements: content.length, totalPages: 1 },
})
const ana = {
  id: 7, email: "ana@x.com", nomeCompleto: "Ana", papel: "CLIENTE", ativo: true, temSenha: false,
  criadoEm: "2026-11-01T12:00:00Z", ultimoLoginEm: null,
}

describe("UsuariosPage", () => {
  beforeEach(() => {
    papelLogado = "SUPERUSUARIO"
    fetchApi.mockReset().mockResolvedValue(pagina())
  })

  it("lista pelo PagedModel, sem colunas de pedidos, comentarios ou ban", async () => {
    fetchApi.mockResolvedValue(pagina([ana]))
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText("ana@x.com")).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/usuarios?page=0&size=20")
    expect(screen.getByRole("cell", { name: "Cliente" })).toBeTruthy()
    expect(screen.getByText(/sem senha/)).toBeTruthy()
    for (const h of [/Pedidos/, /Coment/, /Banimento/, /Freemium/]) expect(screen.queryByText(h)).toBeNull()
  })

  it("filtros Papel e Situacao viram papel= e ativo=", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    await userEvent.selectOptions(await screen.findByLabelText("Papel"), "ADMIN")
    await userEvent.selectOptions(screen.getByLabelText("Situação"), "false")
    await waitFor(() =>
      expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/usuarios?page=0&size=20&papel=ADMIN&ativo=false"),
    )
  })

  it("busca manda q=", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    await userEvent.type(await screen.findByLabelText("Buscar"), "ana")
    await waitFor(() => expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/usuarios?page=0&size=20&q=ana"))
  })

  it("Novo admin cria so com as senhas iguais e manda os campos novos", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole("button", { name: "Novo admin" }))
    await userEvent.type(await screen.findByLabelText("E-mail"), "a@x.com")
    await userEvent.type(screen.getByLabelText("Senha"), "abc")
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "abd")
    const criar = screen.getByRole("button", { name: "Criar admin" }) as HTMLButtonElement
    expect(criar.disabled).toBe(true)
    await userEvent.clear(screen.getByLabelText("Confirmar senha"))
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "abc")
    fetchApi.mockRejectedValueOnce({ pastoralMessage: "Já existe uma conta com este e-mail." })
    await userEvent.click(criar)
    expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/usuarios", {
      method: "POST", body: JSON.stringify({ email: "a@x.com", nomeCompleto: "", senha: "abc" }), showToast: false,
    })
  })

  it("Novo admin: cancelar e reabrir deixa os campos vazios", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole("button", { name: "Novo admin" }))
    await userEvent.type(await screen.findByLabelText("E-mail"), "a@x.com")
    await userEvent.type(screen.getByLabelText("Senha"), "segredo")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByLabelText("Senha")).toBeNull())
    await userEvent.click(screen.getByRole("button", { name: "Novo admin" }))
    expect(((await screen.findByLabelText("Senha")) as HTMLInputElement).value).toBe("")
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("")
  })

  it("admin comum nao ve Novo admin nem as acoes de escrita no detalhe", async () => {
    papelLogado = "ADMIN"
    fetchApi.mockImplementation(async (url: string) => (url.endsWith("/7") ? ana : pagina([ana])))
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    expect(screen.queryByRole("button", { name: "Novo admin" })).toBeNull()
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    expect(await screen.findByText("Identidade")).toBeTruthy()
    expect(screen.queryByText("Acesso")).toBeNull()
    expect(screen.queryByRole("button", { name: "Dados do titular (LGPD)" })).toBeNull()
  })

  it("superusuario ve as acoes de escrita no detalhe", async () => {
    fetchApi.mockImplementation(async (url: string) => (url.endsWith("/7") ? ana : pagina([ana])))
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    expect(await screen.findByRole("button", { name: "Dados do titular (LGPD)" })).toBeTruthy()
  })
})
