import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PedidoEditForm } from "../PedidoEditForm"
import type { AdminPedido } from "@/types/admin.types"

const adminFetch = vi.fn()
vi.mock("@/hooks/useAdminApi", () => ({ useAdminApi: () => ({ adminFetch }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const pedido = {
  id: "p1", nome: "Ana", email: "ana@x.com", telefone: null, idade: 30, sexo: "feminino",
  pedido_oracao: "oi", oracao_gerada: null, valor_centavos: 1000, canal_entrega: "email", status: "pago",
} as AdminPedido
const onSaved = vi.fn()

describe("PedidoEditForm", () => {
  beforeEach(() => {
    adminFetch.mockReset().mockResolvedValue({ ...pedido, nome: "Bia" })
    onSaved.mockReset()
  })

  it("status oferece os valores do model, incluindo enviada e sem oracao_enviada", () => {
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    const valores = Array.from((screen.getByLabelText("Status") as HTMLSelectElement).options).map((o) => o.value)
    expect(valores).toContain("enviada")
    expect(valores).toContain("oracao_gerada")
    expect(valores).toContain("aguardando_confirmacao_email")
    expect(valores).not.toContain("oracao_enviada")
  })

  it("PATCH manda so o que mudou", async () => {
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText("Nome"))
    await userEvent.type(screen.getByLabelText("Nome"), "Bia")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith("/api/admin/pedidos/p1/", {
        method: "PATCH", body: JSON.stringify({ nome: "Bia" }), showToast: false,
      }),
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it("mudar o status mostra o aviso de que nao enfileira job", async () => {
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    expect(screen.queryByText(/não enfileira nenhum job/)).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText("Status"), "enviada")
    expect(screen.getByText(/não enfileira nenhum job/)).toBeTruthy()
    expect(screen.getByText(/pedido preso/)).toBeTruthy()
  })

  it("erro 400 do servidor aparece no formulario", async () => {
    adminFetch.mockRejectedValue({ pastoralMessage: "Informe um endereço de email válido." })
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText("E-mail"))
    await userEvent.type(screen.getByLabelText("E-mail"), "x")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(await screen.findByText("Informe um endereço de email válido.")).toBeTruthy()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
