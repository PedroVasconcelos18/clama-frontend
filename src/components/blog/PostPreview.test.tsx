import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PostPreview } from "./PostPreview"

describe("PostPreview", () => {
  afterEach(() => {
    cleanup()
  })

  it("renderiza HTML do post no wrapper prose-clama", () => {
    const html = "<h2>Sobre a oração</h2><p>Texto do post</p>"
    const { container } = render(<PostPreview html={html} />)

    const article = container.querySelector(
      "article[data-slot='post-preview']",
    )
    expect(article).not.toBeNull()
    expect(article?.className).toContain("prose")
    expect(article?.className).toContain("prose-clama")
    expect(screen.getByText("Sobre a oração")).toBeInTheDocument()
    expect(screen.getByText("Texto do post")).toBeInTheDocument()
  })

  it("renderiza hero com titulo, autor, data e reading time", () => {
    render(
      <PostPreview
        html="<p>conteúdo</p>"
        meta={{
          titulo: "O Clamor",
          autor: "Pedro",
          dataPublicacao: "2026-05-13T10:00:00Z",
          readingTimeMin: 8,
        }}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "O Clamor", level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText("Pedro")).toBeInTheDocument()
    expect(screen.getByText(/8 min de leitura/)).toBeInTheDocument()
    // formato pt-BR (ex: "13 de mai. de 2026") — só confirma que time tag existe
    expect(document.querySelector("time")).not.toBeNull()
  })

  it("omite hero quando meta é undefined", () => {
    const { container } = render(<PostPreview html="<p>só corpo</p>" />)
    expect(container.querySelector("header")).toBeNull()
    expect(screen.getByText("só corpo")).toBeInTheDocument()
  })
})
