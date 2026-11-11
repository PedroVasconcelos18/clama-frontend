import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PedidoEditForm } from "../PedidoEditForm"
import { PastoralApiError } from "@/lib/api"
import type { AdminPedidoDetalhe } from "@/types/admin.types"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const pedido = {
  id: "p1", nome: "Ana", email: "ana@x.com", telefone: null, idade: 30, sexo: "feminino",
  pedidoOracao: "oi", oracaoGerada: null, valorCentavos: 1000, status: "PAGO",
} as AdminPedidoDetalhe
const onSaved = vi.fn()

describe("PedidoEditForm", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockResolvedValue({ ...pedido, nome: "Bia" })
    onSaved.mockReset()
  })

  it("só dados: sem status, canal, valor nem oração (D22, D5)", () => {
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    for (const rotulo of ["Nome", "E-mail", "Telefone", "Idade", "Sexo", "Pedido de oração"])
      expect(screen.getByLabelText(rotulo)).toBeTruthy()
    for (const rotulo of ["Status", "Canal", "Valor (centavos)", "Oração gerada"])
      expect(screen.queryByLabelText(rotulo)).toBeNull()
  })

  it("PATCH manda só o que mudou, em camelCase", async () => {
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText("Nome"))
    await userEvent.type(screen.getByLabelText("Nome"), "Bia")
    await userEvent.type(screen.getByLabelText("Pedido de oração"), "!")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/pedidos/p1", {
        method: "PATCH", body: JSON.stringify({ nome: "Bia", pedidoOracao: "oi!" }), showToast: false,
      }),
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it("erro 400 por campo aparece com o rótulo do campo", async () => {
    fetchApi.mockRejectedValue(
      new PastoralApiError("Erro", "dados_invalidos", "Confira os campos.", 400, {}, { email: "E-mail inválido." }),
    )
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText("E-mail"))
    await userEvent.type(screen.getByLabelText("E-mail"), "x@y")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(await screen.findByText("E-mail: E-mail inválido.")).toBeTruthy()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it("idade não numérica não vai ao servidor", async () => {
    render(<PedidoEditForm pedido={pedido} onSaved={onSaved} onCancel={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText("Idade"))
    await userEvent.type(screen.getByLabelText("Idade"), "abc")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(await screen.findByText("Use só dígitos.")).toBeTruthy()
    expect(fetchApi).not.toHaveBeenCalled()
  })

  it("telefone em branco vai como texto vazio (a API apaga)", async () => {
    render(<PedidoEditForm pedido={{ ...pedido, telefone: "11999999999" }} onSaved={onSaved} onCancel={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText("Telefone"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/pedidos/p1", expect.objectContaining({
        body: JSON.stringify({ telefone: "" }),
      })),
    )
  })
})
