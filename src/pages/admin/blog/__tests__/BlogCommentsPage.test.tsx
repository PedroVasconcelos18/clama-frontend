import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BlogCommentsPage from "../BlogCommentsPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = {
  id: 9,
  criadoEm: "2026-11-01T10:00:00Z",
  conteudo: "amém",
  suspeito: false,
  postSlug: "meu-post",
  postTitulo: "Meu Post",
  postUrl: "https://blog.clama.me/meu-post/",
  usuarioId: 42,
  usuarioEmail: "ana@x.com",
  usuarioNome: "Ana",
}

const pagina = (content: object[]) => ({ content, page: { number: 0, size: 20, totalElements: content.length, totalPages: 1 } })
const urls = () => fetchApi.mock.calls.map(([u]) => u as string)
const escrita = (m: string) => fetchApi.mock.calls.find(([, i]) => i?.method === m)

function abrir(url = "/admin/blog/comentarios") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BlogCommentsPage />
    </MemoryRouter>,
  )
}

describe("BlogCommentsPage", () => {
  beforeEach(() => {
    fetchApi.mockReset()
    fetchApi.mockResolvedValue(pagina([base]))
  })

  it("lista pela rota nova, com post linkado e sem coluna nem valor de IP", async () => {
    abrir()
    expect(await screen.findByText("amém")).toBeInTheDocument()
    expect(urls()[0]).toMatch(/^\/api\/admin\/blog\/comentarios\?/)
    expect(screen.getByRole("link", { name: "Meu Post" })).toHaveAttribute("href", "https://blog.clama.me/meu-post/")
    expect(screen.queryByRole("columnheader", { name: /ip/i })).toBeNull()
  })

  it("filtros suspeitos, post e usuarioId vão na query", async () => {
    abrir("/admin/blog/comentarios?usuarioId=42")
    await screen.findByText("amém")
    expect(urls().at(-1)).toContain("usuarioId=42")
    await userEvent.click(screen.getByRole("tab", { name: "Suspeitos" }))
    await userEvent.type(screen.getByPlaceholderText(/slug do post/i), "meu-post")
    await waitFor(() => {
      const q = new URL(urls().at(-1)!, "http://x").searchParams
      expect(q.get("suspeitos")).toBe("true")
      expect(q.get("post")).toBe("meu-post")
      expect(q.get("usuarioId")).toBe("42")
    })
  })

  it("excluir pede confirmação e só então chama o DELETE", async () => {
    abrir()
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }))
    expect(await screen.findByRole("heading", { name: "Excluir comentário" })).toBeInTheDocument()
    expect(escrita("DELETE")).toBeUndefined()
    await userEvent.click((await screen.findAllByRole("button", { name: "Excluir" })).at(-1)!)
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith("/api/admin/blog/comentarios/9", { method: "DELETE" }))
  })

  it("banir exige motivo (mínimo 3) e manda { usuarioId, motivo }", async () => {
    abrir()
    await userEvent.click(await screen.findByRole("button", { name: "Banir" }))
    await screen.findByRole("dialog")
    const confirmar = () => screen.getAllByRole("button", { name: "Banir" }).at(-1)!
    expect(confirmar()).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Motivo/), "  ab ")
    expect(confirmar()).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Motivo/), "c")
    await userEvent.click(confirmar())
    await waitFor(() => {
      const [url, init] = escrita("POST")!
      expect(url).toBe("/api/admin/blog/banimentos")
      expect(JSON.parse(init.body)).toEqual({ usuarioId: 42, motivo: "ab c" })
    })
  })
})
