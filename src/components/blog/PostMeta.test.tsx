import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PostMeta } from "./PostMeta"

describe("PostMeta", () => {
  afterEach(cleanup)

  it("renderiza nome do autor, inicial em avatar, tempo relativo", () => {
    render(
      <PostMeta
        post={{
          autor: { nome: "Pedro" },
          data_publicacao: new Date(
            Date.now() - 2 * 60 * 60 * 1000,
          ).toISOString(),
        }}
      />,
    )
    expect(screen.getByText("Pedro")).toBeInTheDocument()
    expect(screen.getByText("P")).toBeInTheDocument()
    expect(screen.getByText(/há \d+ hora/i)).toBeInTheDocument()
  })

  it("aceita autor string", () => {
    render(
      <PostMeta
        post={{ autor: "Pedro V.", data_publicacao: "2026-05-13T10:00:00Z" }}
      />,
    )
    expect(screen.getByText("Pedro V.")).toBeInTheDocument()
    expect(screen.getByText("P")).toBeInTheDocument()
  })

  it("mostra readingTimeMin quando fornecido", () => {
    render(
      <PostMeta
        post={{
          autor: "Pedro",
          data_publicacao: "2026-05-13T10:00:00Z",
          readingTimeMin: 6,
        }}
      />,
    )
    expect(screen.getByText(/6 min de leitura/)).toBeInTheDocument()
  })

  it("não renderiza time tag quando data ausente", () => {
    const { container } = render(<PostMeta post={{ autor: "Pedro" }} />)
    expect(container.querySelector("time")).toBeNull()
  })
})
