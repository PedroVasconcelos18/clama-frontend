import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PostCard, type PostCardInput } from "./PostCard"

function makePost(overrides: Partial<PostCardInput> = {}): PostCardInput {
  return {
    slug: "post-x",
    titulo: "Sobre a oração",
    excerpt: "Um excerpt curto.",
    imagem_capa_url: "https://exemplo.com/capa.jpg",
    data_publicacao: "2026-05-13T10:00:00Z",
    historia_ilustrativa: false,
    autor_nome: "Pedro",
    conteudo_html: "<p>texto</p>",
    like_count: 42,
    comment_count: 7,
    ...overrides,
  }
}

describe("PostCard", () => {
  afterEach(cleanup)

  it("renderiza link pro post com aria-label descritivo", () => {
    render(<PostCard post={makePost()} />)
    const link = screen.getByRole("link", { name: /ler post: sobre a oração/i })
    expect(link).toHaveAttribute("href", "/blog/post-x")
  })

  it("renderiza título, excerpt e counts", () => {
    render(<PostCard post={makePost()} />)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Sobre a oração",
    )
    expect(screen.getByText("Um excerpt curto.")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText(/\d+ min/)).toBeInTheDocument()
  })

  it("usa <img> quando há imagem_capa_url", () => {
    const { container } = render(<PostCard post={makePost()} />)
    expect(container.querySelector("img")).not.toBeNull()
  })

  it("usa glow decorativo (sem <img>) quando imagem_capa_url vazia", () => {
    const { container } = render(
      <PostCard post={makePost({ imagem_capa_url: "" })} />,
    )
    expect(container.querySelector("img")).toBeNull()
  })

  it("default 0 quando counts ausentes", () => {
    render(
      <PostCard
        post={makePost({ like_count: undefined, comment_count: undefined })}
      />,
    )
    // dois "0" (likes e comentários)
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2)
  })

  it("deriva badge de categoria de historia_ilustrativa", () => {
    const { rerender } = render(
      <PostCard post={makePost({ historia_ilustrativa: true })} />,
    )
    expect(screen.getByText("História")).toBeInTheDocument()
    rerender(<PostCard post={makePost({ historia_ilustrativa: false })} />)
    expect(screen.getByText("Reflexão")).toBeInTheDocument()
  })
})
