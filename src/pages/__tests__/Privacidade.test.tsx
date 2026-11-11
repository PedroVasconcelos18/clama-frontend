import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import Privacidade from "@/pages/Privacidade"

vi.mock("@/components/clama/StickyNav", () => ({ StickyNav: () => null }))
vi.mock("@/components/clama/Footer", () => ({ Footer: () => null }))

describe("Privacidade 13.B.4", () => {
  it("diz onde apagar os comentários e linka /conta", () => {
    render(
      <MemoryRouter>
        <Privacidade />
      </MemoryRouter>,
    )
    expect(screen.getByText(/na seção “Seus comentários no blog”/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Minha conta" })).toHaveAttribute("href", "/conta")
    expect(screen.queryByText(/pela interface do blog/)).not.toBeInTheDocument()
  })
})
