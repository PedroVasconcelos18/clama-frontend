import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VersiculoDestacado } from "./VersiculoDestacado"

describe("VersiculoDestacado", () => {
  it("renderiza texto, referência e versão padrão (ARC)", () => {
    render(
      <VersiculoDestacado referencia="João 3:16">
        Porque Deus amou o mundo de tal maneira
      </VersiculoDestacado>,
    )

    expect(
      screen.getByText("Porque Deus amou o mundo de tal maneira"),
    ).toBeInTheDocument()
    expect(screen.getByText(/João 3:16/)).toBeInTheDocument()
    expect(screen.getByText(/\(ARC\)/)).toBeInTheDocument()
  })

  it("aceita versão custom", () => {
    render(
      <VersiculoDestacado referencia="Salmo 23:1" versao="NVI">
        O Senhor é o meu pastor
      </VersiculoDestacado>,
    )

    expect(screen.getByText(/\(NVI\)/)).toBeInTheDocument()
  })

  it("aplica classe 'versiculo' + data-attrs no <blockquote>", () => {
    const { container } = render(
      <VersiculoDestacado referencia="Romanos 8:28" versao="ACF">
        Sabemos que todas as coisas
      </VersiculoDestacado>,
    )

    const blockquote = container.querySelector("blockquote")
    expect(blockquote).not.toBeNull()
    expect(blockquote?.classList.contains("versiculo")).toBe(true)
    expect(blockquote?.getAttribute("data-referencia")).toBe("Romanos 8:28")
    expect(blockquote?.getAttribute("data-versao")).toBe("ACF")
  })

  it("não renderiza <cite> se referência vazia", () => {
    const { container } = render(
      <VersiculoDestacado referencia="">Texto sem ref</VersiculoDestacado>,
    )

    expect(container.querySelector("cite")).toBeNull()
  })
})
