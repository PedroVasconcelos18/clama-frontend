import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WebhooksPage from "../WebhooksPage"

const adminFetch = vi.fn()
vi.mock("@/hooks/useAdminApi", () => ({ useAdminApi: () => ({ adminFetch }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const evento = {
  id: "w1", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
  provider: "MERCADO_PAGO", event_type: "payment", status: "ERRO",
  external_event_id: "evt-123", pedido_id: null, error_message: "falhou",
}

describe("WebhooksPage", () => {
  beforeEach(() => {
    adminFetch.mockReset()
    adminFetch.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return Promise.resolve({ status: "PROCESSADO" })
      if (url === "/api/admin/webhooks/w1/")
        return Promise.resolve({ ...evento, payload: { data: { id: "999" } } })
      return Promise.resolve({ count: 45, next: null, previous: null, results: [evento] })
    })
  })

  it("renderiza a lista sem payload", async () => {
    render(<WebhooksPage />)
    expect(await screen.findByText("evt-123")).toBeTruthy()
    expect(screen.queryByText("Payload")).toBeNull()
  })

  it("paginacao envia limit e offset", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith("/api/admin/webhooks/?limit=20&offset=20"),
    )
  })

  it("detalhe mostra o payload", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    expect(await screen.findByText(/"999"/)).toBeTruthy()
  })

  it("Reprocessar pede confirmacao antes de chamar o POST", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Reprocessar/ }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog.textContent).toMatch(/marcado como pago/)
    expect(adminFetch.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false)
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reprocesso" }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith("/api/admin/webhooks/w1/reprocessar/", {
        method: "POST",
        showToast: false,
      }),
    )
  })
})
