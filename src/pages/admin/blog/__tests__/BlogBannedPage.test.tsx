import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BlogBannedPage from "../BlogBannedPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const banido = {
  id: "b1",
  customer: 42,
  customer_email: "ana@x.com",
  customer_nome: "Ana",
  motivo: "spam",
  banido_em: "2026-11-01T10:00:00Z",
  banido_por_email: "admin@x.com",
  revogado_em: null,
}

describe("BlogBannedPage", () => {
  beforeEach(() => {
    fetchApi.mockReset()
    fetchApi.mockImplementation((_url: string, init?: { method?: string }) =>
      Promise.resolve(
        init?.method === "DELETE"
          ? null
          : { count: 1, next: null, previous: null, results: [banido] },
      ),
    )
  })

  it("Revogar chama DELETE com o id do customer na URL", async () => {
    render(<BlogBannedPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Revogar" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (b) => b.textContent === "Revogar",
      )!,
    )
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith(
        "/api/blog/admin/banned-customers/42/",
        { method: "DELETE" },
      ),
    )
  })
})
