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
    created_at: "2026-05-10T08:00:00Z",
    autor: { nome: "Pedro" },
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

  it("renderiza título, excerpt e stats com counts", () => {
    render(<PostCard post={makePost()} />)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Sobre a oração",
    )
    expect(screen.getByText("Um excerpt curto.")).toBeInTheDocument()
    expect(screen.getByLabelText("42 likes")).toBeInTheDocument()
    expect(screen.getByLabelText("7 comentários")).toBeInTheDocument()
    expect(screen.getByText(/min de leitura/)).toBeInTheDocument()
  })

  it("omite imagem quando imagem_capa_url está vazia", () => {
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
    expect(screen.getByLabelText("0 likes")).toBeInTheDocument()
    expect(screen.getByLabelText("0 comentários")).toBeInTheDocument()
  })
})
