import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import FreemiumBloqueiosPage from "../FreemiumBloqueiosPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const bloqueio = {
  id: 11, criadoEm: "2026-11-01T10:00:00Z", emailHmacCurto: "bbbbbbbbbbbb…",
  cpfHmacCurto: "aaaaaaaaaaaa…", temIp: true,
}
const achado = { ...bloqueio, id: 12, emailHmacCurto: "cccccccccccc…", cpfHmacCurto: "dddddddddddd…", temIp: false }

describe("FreemiumBloqueiosPage", () => {
  beforeEach(() => {
    fetchApi.mockReset()
    fetchApi.mockImplementation((url: string, init?: { method?: string }) => {
      if (url.endsWith("/busca")) return Promise.resolve([achado])
      if (init?.method === "DELETE") return Promise.resolve(undefined)
      return Promise.resolve({ content: [bloqueio], page: { size: 20, number: 0, totalElements: 45, totalPages: 3 } })
    })
  })

  it("lista os bloqueios do PagedModel com hashes truncados e sem a aba de tokens", async () => {
    render(<FreemiumBloqueiosPage />)
    expect(await screen.findByText("bbbbbbbbbbbb…")).toBeTruthy()
    expect(screen.getByText("aaaaaaaaaaaa…")).toBeTruthy()
    expect(screen.getByText(/Todos os bloqueios \(45\)/)).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/freemium/bloqueios?page=0&size=20")
    expect(screen.queryByRole("tab")).toBeNull()
    expect(screen.queryByText(/Telefone|Dispositivo/)).toBeNull()
  })

  it("paginação pede page e size", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() => expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/freemium/bloqueios?page=1&size=20"))
  })

  it("busca por e-mail e CPF usa POST com o corpo e nunca põe o valor na URL", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.type(await screen.findByLabelText("E-mail"), "ana@x.com")
    await userEvent.type(screen.getByLabelText("CPF/CNPJ"), "529.982.247-25")
    await userEvent.click(screen.getByRole("button", { name: /Buscar bloqueio/ }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/freemium/bloqueios/busca", {
        method: "POST",
        body: JSON.stringify({ email: "ana@x.com", cpfCnpj: "529.982.247-25" }),
      }),
    )
    expect(await screen.findByText("cccccccccccc…")).toBeTruthy()
    for (const [url] of fetchApi.mock.calls) {
      expect(url).not.toContain("ana")
      expect(url).not.toContain("529")
    }
  })

  it("busca vazia não chama a API", async () => {
    render(<FreemiumBloqueiosPage />)
    await screen.findByText("bbbbbbbbbbbb…")
    const n = fetchApi.mock.calls.length
    await userEvent.click(screen.getByRole("button", { name: /Buscar bloqueio/ }))
    expect(fetchApi.mock.calls.length).toBe(n)
  })

  it("resultado vazio da busca mostra o aviso", async () => {
    fetchApi.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/busca") ? [] : { content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } },
      ),
    )
    render(<FreemiumBloqueiosPage />)
    await userEvent.type(await screen.findByLabelText("E-mail"), "ninguem@x.com")
    await userEvent.click(screen.getByRole("button", { name: /Buscar bloqueio/ }))
    expect(await screen.findByText(/Nenhum bloqueio encontrado/)).toBeTruthy()
  })

  it("Desbloquear pede confirmação antes do DELETE e recarrega a lista", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.click((await screen.findAllByRole("button", { name: /Desbloquear/ }))[0]!)
    const dialog = await screen.findByRole("dialog")
    expect(dialog.textContent).toMatch(/oração gratuita/)
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false)
    const listagens = fetchApi.mock.calls.length
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar desbloqueio" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/freemium/bloqueios/11", {
        method: "DELETE",
        showToast: false,
      }),
    )
    await waitFor(() => expect(fetchApi.mock.calls.length).toBeGreaterThan(listagens + 1))
  })

  it("Cancelar no diálogo não chama o DELETE", async () => {
    render(<FreemiumBloqueiosPage />)
    await userEvent.click((await screen.findAllByRole("button", { name: /Desbloquear/ }))[0]!)
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }))
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false)
  })
})
