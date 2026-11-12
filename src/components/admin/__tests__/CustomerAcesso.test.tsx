import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { CustomerAcesso } from "../CustomerAcesso"
import type { UsuarioAdmin } from "@/types/usuario-admin"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("@/contexts/SessaoContext", () => ({ useSessao: () => ({ usuario: { id: 1, papel: "SUPERUSUARIO" } }) }))
const navigate = vi.fn()
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<typeof import("react-router-dom")>()), useNavigate: () => navigate }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = {
  id: 7, email: "Ana@Exemplo.com", nomeCompleto: "Ana", ativo: true, papel: "CLIENTE", temSenha: true,
} as UsuarioAdmin

const onChanged = vi.fn()
const montar = (c: Partial<UsuarioAdmin> = {}) =>
  render(<CustomerAcesso customer={{ ...base, ...c }} onChanged={onChanged} />)
const chamadas = () => fetchApi.mock.calls.filter(([, i]) => i?.method)

describe("CustomerAcesso", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockResolvedValue({})
    onChanged.mockReset()
    navigate.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("Tornar admin pede confirmacao e so entao faz o PATCH", async () => {
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Tornar admin" }))
    expect(chamadas()).toHaveLength(0)
    expect(await screen.findByText("Tornar admin?")).toBeTruthy()
    await userEvent.click(screen.getAllByRole("button", { name: "Tornar admin" }).at(-1)!)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/usuarios/7", {
        method: "PATCH", body: JSON.stringify({ papel: "ADMIN" }), showToast: false,
      }),
    )
    expect(onChanged).toHaveBeenCalled()
  })

  it("Desativar pede confirmacao antes do PATCH is_active", async () => {
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Desativar conta" }))
    expect(await screen.findByText("Desativar conta?")).toBeTruthy()
    expect(chamadas()).toHaveLength(0)
    await userEvent.click(screen.getAllByRole("button", { name: "Desativar conta" }).at(-1)!)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/usuarios/7", expect.objectContaining({
        body: JSON.stringify({ ativo: false }),
      })),
    )
  })

  it("nao ha mais Excluir usuario; o atalho LGPD leva o e-mail no state, nunca na URL", async () => {
    montar()
    expect(screen.queryByRole("button", { name: "Excluir usuário" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Dados do titular (LGPD)" }))
    expect(navigate).toHaveBeenCalledWith("/admin/lgpd", { state: { email: "Ana@Exemplo.com" } })
    expect(chamadas()).toHaveLength(0)
  })

  it("403 do back aparece na tela e no toast", async () => {
    fetchApi.mockRejectedValue({ pastoralMessage: "Só o superusuário gerencia usuários." })
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Tornar admin" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Tornar admin" }).at(-1)!)
    expect(await screen.findByText("Só o superusuário gerencia usuários.")).toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith("Só o superusuário gerencia usuários.")
    expect(onChanged).not.toHaveBeenCalled()
  })

  it("definir senha exige confirmacao igual e mostra as mensagens do servidor", async () => {
    fetchApi.mockRejectedValue({ pastoralMessage: "Esta senha é muito curta." })
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Definir senha" }))
    await userEvent.type(await screen.findByLabelText("Nova senha"), "abc")
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "abd")
    const ok = screen.getAllByRole("button", { name: "Definir senha" }).at(-1)! as HTMLButtonElement
    expect(ok.disabled).toBe(true)
    await userEvent.clear(screen.getByLabelText("Confirmar senha"))
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "abc")
    await userEvent.click(ok)
    expect(await screen.findByText("Esta senha é muito curta.")).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/usuarios/7/senha", {
      method: "POST", body: JSON.stringify({ senha: "abc" }), showToast: false,
    })
  })

  it("remover admin manda papel CLIENTE; superusuario nao tem botao de admin", async () => {
    const { unmount } = montar({ papel: "ADMIN" })
    await userEvent.click(screen.getByRole("button", { name: "Remover admin" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Remover admin" }).at(-1)!)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/usuarios/7", expect.objectContaining({
        body: JSON.stringify({ papel: "CLIENTE" }),
      })),
    )
    unmount()
    montar({ papel: "SUPERUSUARIO" })
    expect(screen.queryByRole("button", { name: /admin/i })).toBeNull()
  })

  it("na propria conta os botoes de acesso ficam desabilitados", () => {
    montar({ id: 1, papel: "ADMIN" })
    expect((screen.getByRole("button", { name: "Remover admin" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("cancelar limpa a senha: ao reabrir os campos estao vazios", async () => {
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Definir senha" }))
    await userEvent.type(await screen.findByLabelText("Nova senha"), "segredo")
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "segredo")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByLabelText("Nova senha")).toBeNull())
    await userEvent.click(screen.getByRole("button", { name: "Definir senha" }))
    expect((await screen.findByLabelText("Nova senha") as HTMLInputElement).value).toBe("")
    expect((screen.getByLabelText("Confirmar senha") as HTMLInputElement).value).toBe("")
  })
})
