import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach } from "vitest"
import ComoFunciona from "../ComoFunciona"
import { SessaoProvider } from "@/contexts/SessaoContext"

vi.mock("@/lib/api/metas", () => ({
  buscarMetas: vi.fn().mockResolvedValue({
    percentual: 20,
    de: "2026-11-28",
    ate: "2026-12-27",
    instituicoes: [],
  }),
}))

beforeEach(() => localStorage.clear())

function renderPagina() {
  return render(
    <MemoryRouter>
      <SessaoProvider>
        <ComoFunciona />
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe("ComoFunciona", () => {
  it("renderiza 'O que o Clama não faz'", () => {
    renderPagina()
    expect(screen.getByText("O que o Clama não faz")).toBeInTheDocument()
  })

  it("mostra o percentual vindo de buscarMetas", async () => {
    renderPagina()
    await waitFor(() => expect(screen.getByText(/20%/)).toBeInTheDocument())
  })

  it("não contém termos fora do escopo da Onda 1", async () => {
    const { container } = renderPagina()
    await waitFor(() => expect(screen.getByText(/20%/)).toBeInTheDocument())
    const texto = container.textContent ?? ""
    for (const proibido of ["intercessor", "Marta", "90%", "WhatsApp"]) {
      expect(texto).not.toContain(proibido)
    }
  })
})
