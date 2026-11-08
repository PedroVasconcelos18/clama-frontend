import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BlogCommentsPage from "../BlogCommentsPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = {
  id: "c1",
  post: null,
  customer: 42,
  customer_email: "ana@x.com",
  customer_nome: "Ana",
  conteudo: "amém",
  is_suspeito: false,
  ip_address: "1.2.3.4",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
}

function responder(results: object[]) {
  fetchApi.mockResolvedValue({ count: results.length, next: null, previous: null, results })
}

describe("BlogCommentsPage", () => {
  beforeEach(() => fetchApi.mockReset())

  it("mostra o botão Banir e envia customer_id com o id do customer", async () => {
    responder([base])
    render(<BlogCommentsPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Banir" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (b) => b.textContent === "Banir",
      )!,
    )
    await waitFor(() => {
      const post = fetchApi.mock.calls.find(([, i]) => i?.method === "POST")
      expect(post?.[0]).toBe("/api/blog/admin/banned-customers/")
      expect(JSON.parse(post![1].body)).toMatchObject({ customer_id: 42 })
    })
  })

  it("filtra por post_espelho (não post__slug)", async () => {
    responder([base])
    render(<BlogCommentsPage />)
    await screen.findByText("amém")
    await userEvent.type(screen.getByPlaceholderText(/slug do post/i), "meu-post")
    await waitFor(() => {
      const url = fetchApi.mock.calls.at(-1)![0] as string
      expect(url).toContain("post_espelho=meu-post")
      expect(url).not.toContain("post__slug")
    })
  })

  it("título linka para post_espelho_url", async () => {
    responder([
      {
        ...base,
        post_espelho_slug: "meu-post",
        post_espelho_titulo: "Meu Post",
        post_espelho_url: "https://blog.clama.me/meu-post/",
      },
    ])
    render(<BlogCommentsPage />)
    const link = await screen.findByRole("link", { name: "Meu Post" })
    expect(link).toHaveAttribute("href", "https://blog.clama.me/meu-post/")
  })

  it("sem chaves do espelho mostra traço e nenhum link", async () => {
    responder([base])
    render(<BlogCommentsPage />)
    await screen.findByText("amém")
    expect(screen.queryByRole("link")).toBeNull()
  })
})
