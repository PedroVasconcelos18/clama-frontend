import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import PedidosListPage from "../PedidosListPage"

const adminFetch = vi.fn()
vi.mock("@/hooks/useAdminApi", () => ({ useAdminApi: () => ({ adminFetch }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const item = {
  id: "12345678-aaaa-bbbb-cccc-1234567890ab", nome: "Ana", email: "ana@x.com", plano_nome: "Mensal",
  valor_reais_str: "R$ 10,00", status: "enviada", canal_entrega: "email", created_at: "2026-11-01T10:00:00Z",
}

describe("PedidosListPage", () => {
  beforeEach(() => {
    adminFetch.mockReset().mockResolvedValue({ count: 45, next: null, previous: null, results: [item] })
  })

  it("paginacao envia limit e offset (nao page)", async () => {
    render(<PedidosListPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() => expect(adminFetch).toHaveBeenLastCalledWith("/api/admin/pedidos/?limit=20&offset=20"))
  })

  it("canal vai em canal, busca em q, status com o valor do model; filtro volta ao offset 0", async () => {
    render(<PedidosListPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await userEvent.selectOptions(screen.getByLabelText("Canal"), "whatsapp")
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith("/api/admin/pedidos/?limit=20&offset=0&canal=whatsapp"),
    )
    await userEvent.selectOptions(screen.getByLabelText("Status"), "enviada")
    await userEvent.type(screen.getByLabelText("Buscar pedidos"), "ana")
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith(
        "/api/admin/pedidos/?limit=20&offset=0&q=ana&status=enviada&canal=whatsapp",
      ),
    )
  })

  it("explica na busca que pedido com conta e achado pela conta", async () => {
    render(<PedidosListPage />)
    expect(await screen.findByText(/não tem conta/)).toBeTruthy()
  })
})
