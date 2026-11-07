import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import FreemiumBloqueiosPage from "../FreemiumBloqueiosPage"

const adminFetch = vi.fn()
vi.mock("@/hooks/useAdminApi", () => ({ useAdminApi: () => ({ adminFetch }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const bloqueio = {
  id: "b1", created_at: "2026-11-01T10:00:00Z", cpf_hash_curto: "aaaaaaaaaaaa…",
  email_hash_curto: "bbbbbbbbbbbb…", tem_telefone: true, tem_device: false, tem_ip: true,
}
const token = {
  id: "t1", token_curto: "abcd1234…", pedido_id: "12345678-aaaa-bbbb-cccc-1234567890ab",
  created_at: "2026-11-01T10:00:00Z", expires_at: "2026-11-02T10:00:00Z", used_at: null,
}

describe("FreemiumBloqueiosPage", () => {
  beforeEach(() => {
    adminFetch.mockReset()
    adminFetch.mockImplementation((url: string, init?: { method?: string }) => {
      if (url.includes("/buscar/")) return Promise.resolve([bloqueio])
      if (init?.method === "DELETE") return Promise.resolve({})
      if (url.startsWith("/api/admin/freemium/tokens/"))
        return Promise.resolve({ count: 1, next: null, previous: null, results: [token] })
      return Promise.resolve({ count: 45, next: null, previous: null, results: [bloqueio] })
    })
  })

  it("renderiza a lista com hashes truncados", async () => {
    render(<FreemiumBloqueiosPage />)
    expect(await screen.findByText("bbbbbbbbbbbb…")).toBeTruthy()
  })

  it("paginacao envia limit e offset", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenLastCalledWith("/api/admin/freemium/bloqueios/?limit=20&offset=20"),
    )
  })

  it("busca usa POST com o corpo e nunca poe o valor na URL", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.type(await screen.findByLabelText("E-mail"), "ana@x.com")
    await userEvent.type(screen.getByLabelText("Telefone"), "11999998888")
    await userEvent.click(screen.getByRole("button", { name: /Buscar bloqueio/ }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith("/api/admin/freemium/bloqueios/buscar/", {
        method: "POST",
        body: JSON.stringify({ email: "ana@x.com", telefone: "11999998888" }),
      }),
    )
    for (const [url] of adminFetch.mock.calls) {
      expect(url).not.toContain("ana")
      expect(url).not.toContain("1199999")
    }
  })

  it("Desbloquear pede confirmacao antes do DELETE", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.click((await screen.findAllByRole("button", { name: /Desbloquear/ }))[0]!)
    const dialog = await screen.findByRole("dialog")
    expect(dialog.textContent).toMatch(/oração gratuita/)
    expect(adminFetch.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false)
    await userEvent.click(screen.getByRole("button", { name: "Confirmar desbloqueio" }))
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith("/api/admin/freemium/bloqueios/b1/", {
        method: "DELETE",
        showToast: false,
      }),
    )
  })

  it("aba de tokens lista tokens truncados", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Tokens de confirmação" }))
    expect(await screen.findByText("abcd1234…")).toBeTruthy()
  })
})
