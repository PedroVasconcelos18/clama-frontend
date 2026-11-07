import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import RepassesPage from "../RepassesPage"

const adminFetch = vi.fn()
vi.mock("@/hooks/useAdminApi", () => ({ useAdminApi: () => ({ adminFetch }) }))

const repasse = {
  id: "r1", pedido_id: "12345678-aaaa-bbbb-cccc-1234567890ab", instituicao_id: "i1",
  instituicao_nome: "Mar de Espanha", valor_base_centavos: 10000, percentual: 10,
  valor_centavos: 1000, status: "registrado", transferido_em: null, comprovante: "",
  created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
}

describe("RepassesPage", () => {
  beforeEach(() => {
    adminFetch.mockReset()
    adminFetch.mockResolvedValue({ count: 45, next: null, previous: null, results: [repasse] })
  })

  it("renderiza a lista", async () => {
    render(<RepassesPage />)
    expect(await screen.findByText("Mar de Espanha")).toBeTruthy()
    expect(screen.getByText(/10,00/)).toBeTruthy()
  })

  it("paginacao envia limit e offset; filtro de status volta ao offset 0", async () => {
    render(<RepassesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith("/api/admin/repasses/?limit=20&offset=20"),
    )
    await userEvent.selectOptions(screen.getByLabelText("Status"), "transferido")
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith(
        "/api/admin/repasses/?limit=20&offset=0&status=transferido",
      ),
    )
  })
})
