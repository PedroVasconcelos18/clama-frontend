import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BlogBannedPage from "../BlogBannedPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const banido = {
  usuarioId: 42,
  usuarioEmail: "ana@x.com",
  usuarioNome: "Ana",
  motivo: "spam",
  banidoEm: "2026-11-01T10:00:00Z",
  banidoPorEmail: "admin@x.com",
}

describe("BlogBannedPage", () => {
  beforeEach(() => {
    fetchApi.mockReset()
    fetchApi.mockImplementation((_url: string, init?: { method?: string }) =>
      Promise.resolve(
        init?.method === "DELETE"
          ? null
          : { content: [banido], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } },
      ),
    )
  })

  it("lista os banimentos da rota nova", async () => {
    render(<BlogBannedPage />)
    expect(await screen.findByText("spam")).toBeInTheDocument()
    expect(screen.getByText("admin@x.com")).toBeInTheDocument()
    expect(fetchApi.mock.calls[0]![0]).toMatch(/^\/api\/admin\/blog\/banimentos\?/)
  })

  it("Revogar pede confirmação e chama DELETE com o usuarioId na URL", async () => {
    render(<BlogBannedPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Revogar" }))
    expect(await screen.findByRole("heading", { name: "Revogar banimento" })).toBeInTheDocument()
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false)
    await userEvent.click((await screen.findAllByRole("button", { name: "Revogar" })).at(-1)!)
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/blog/banimentos/42", { method: "DELETE" }),
    )
  })
})
