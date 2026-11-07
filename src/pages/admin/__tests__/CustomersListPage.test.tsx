import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CustomersListPage from "../CustomersListPage"

const adminFetch = vi.fn()
vi.mock("@/hooks/useAdminApi", () => ({ useAdminApi: () => ({ adminFetch }) }))
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "1" } }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe("CustomersListPage", () => {
  beforeEach(() => {
    adminFetch.mockReset().mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  })

  it("filtro Tipo manda admin=", async () => {
    render(<CustomersListPage />)
    await userEvent.selectOptions(await screen.findByLabelText("Tipo"), "true")
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith("/api/admin/customers/?limit=20&offset=0&admin=true"),
    )
  })

  it("Novo admin cria so com as senhas iguais e mostra o erro do servidor", async () => {
    render(<CustomersListPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Novo admin" }))
    await userEvent.type(await screen.findByLabelText("E-mail"), "a@x.com")
    await userEvent.type(screen.getByLabelText("Senha"), "abc")
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "abd")
    const criar = screen.getByRole("button", { name: "Criar admin" }) as HTMLButtonElement
    expect(criar.disabled).toBe(true)
    await userEvent.clear(screen.getByLabelText("Confirmar senha"))
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "abc")
    adminFetch.mockRejectedValueOnce({ pastoralMessage: "Usuário com este E-mail já existe." })
    await userEvent.click(criar)
    expect(await screen.findByText("Usuário com este E-mail já existe.")).toBeTruthy()
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/customers/", {
      method: "POST", body: JSON.stringify({ email: "a@x.com", nome_completo: "", password: "abc" }), showToast: false,
    })
  })
})
