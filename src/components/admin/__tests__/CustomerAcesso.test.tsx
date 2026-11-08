import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { CustomerAcesso } from "../CustomerAcesso"
import type { AdminCustomerDetail } from "@/types/admin.types"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "1" } }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = {
  id: 7, email: "Ana@Exemplo.com", nome_completo: "Ana", is_active: true, is_clama_admin: false,
  total_pedidos: 3, total_comentarios: 2,
} as AdminCustomerDetail

const onChanged = vi.fn()
const onDeleted = vi.fn()
const montar = (c: Partial<AdminCustomerDetail> = {}) =>
  render(<CustomerAcesso customer={{ ...base, ...c }} onChanged={onChanged} onDeleted={onDeleted} />)
const chamadas = () => fetchApi.mock.calls.filter(([, i]) => i?.method)

describe("CustomerAcesso", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockResolvedValue({})
    onChanged.mockReset()
    onDeleted.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("Tornar admin pede confirmacao e so entao faz o PATCH", async () => {
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Tornar admin" }))
    expect(chamadas()).toHaveLength(0)
    expect(await screen.findByText("Tornar admin?")).toBeTruthy()
    await userEvent.click(screen.getAllByRole("button", { name: "Tornar admin" }).at(-1)!)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/customers/7/", {
        method: "PATCH", body: JSON.stringify({ is_clama_admin: true }), showToast: false,
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
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/customers/7/", expect.objectContaining({
        body: JSON.stringify({ is_active: false }),
      })),
    )
  })

  it("excluir so habilita depois de digitar o e-mail", async () => {
    montar()
    await userEvent.click(screen.getByRole("button", { name: "Excluir usuário" }))
    const confirmar = (await screen.findAllByRole("button", { name: "Excluir usuário" })).at(-1)!
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/3 pedidos/)).toBeTruthy()
    await userEvent.type(screen.getByLabelText(/Digite/), "outro@x.com")
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)
    await userEvent.clear(screen.getByLabelText(/Digite/))
    await userEvent.type(screen.getByLabelText(/Digite/), "ana@exemplo.com")
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)
    expect(chamadas()).toHaveLength(0)
    await userEvent.click(confirmar)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/customers/7/", { method: "DELETE", showToast: false }),
    )
    expect(onDeleted).toHaveBeenCalled()
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
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/customers/7/senha/", {
      method: "POST", body: JSON.stringify({ password: "abc" }), showToast: false,
    })
  })

  it("na propria conta os botoes de acesso ficam desabilitados", () => {
    montar({ id: 1 })
    expect((screen.getByRole("button", { name: "Excluir usuário" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Tornar admin" }) as HTMLButtonElement).disabled).toBe(true)
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
