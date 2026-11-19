import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect } from "vitest"
import { SiteHeader } from "../SiteHeader"
import { SessaoProvider } from "@/contexts/SessaoContext"

describe("SiteHeader", () => {
  it("o menu quebra linha em telas estreitas (sem rolagem horizontal)", () => {
    render(
      <MemoryRouter>
        <SessaoProvider>
          <SiteHeader active="blog" />
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole("navigation", { name: /principal/i }).className).toMatch(/flex-wrap/)
  })
})
