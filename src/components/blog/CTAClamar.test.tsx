import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { CTAClamar } from "./CTAClamar"

describe("CTAClamar", () => {
  afterEach(cleanup)

  it("default variant 'bottom' tem copy + cta corretos", () => {
    render(<CTAClamar />)
    const link = screen.getByRole("link", { name: "Quero pedir uma oração" })
    expect(link).toHaveAttribute("href", "/")
    expect(link).toHaveAttribute("rel", "nofollow")
    expect(link.getAttribute("data-variant")).toBe("bottom")
    expect(
      screen.getByText(/sua dor merece uma oração escrita/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/quero clamar/i)).toBeInTheDocument()
  })

  it("variant 'after-comments' tem copy reduzido", () => {
    render(<CTAClamar variant="after-comments" />)
    const link = screen.getByRole("link", { name: "Quero pedir uma oração" })
    expect(link.getAttribute("data-variant")).toBe("after-comments")
    expect(screen.getByText(/pronta pra clamar/i)).toBeInTheDocument()
  })

  it("aceita href custom", () => {
    render(<CTAClamar href="/fazer-pedido" />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/fazer-pedido")
  })
})
