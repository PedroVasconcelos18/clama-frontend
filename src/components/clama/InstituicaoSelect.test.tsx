import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll } from "vitest"

import { InstituicaoSelect } from "./InstituicaoSelect"
import type { Instituicao } from "@/types/instituicao.types"

// base-ui Select depende de APIs de browser que o jsdom não implementa
// (ResizeObserver, pointer capture, scrollIntoView, matchMedia). Sem esses
// stubs o popup não abre e o userEvent.click quebra.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()

  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }

  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }
})

const LOGO_CASA = "data:image/png;base64,AAAA"
const INSTITUICOES: Instituicao[] = [
  { id: "inst-1", nome: "Casa de Apoio", logo: LOGO_CASA },
  { id: "inst-2", nome: "Lar Esperança", logo: "" },
]

describe("InstituicaoSelect", () => {
  it("renderiza logo e nome de cada instituição ao abrir o dropdown", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <InstituicaoSelect
        instituicoes={INSTITUICOES}
        value={null}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("combobox"))

    const opcaoCasa = await screen.findByRole("option", {
      name: /Casa de Apoio/i,
    })
    expect(opcaoCasa).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: /Lar Esperança/i }),
    ).toBeInTheDocument()

    // Logo (img) presente dentro das opções.
    const logos = opcaoCasa.querySelectorAll("img")
    expect(logos.length).toBeGreaterThan(0)
    expect(logos[0]).toHaveAttribute("src", LOGO_CASA)
  })

  it("emite o id ao selecionar uma instituição", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <InstituicaoSelect
        instituicoes={INSTITUICOES}
        value={null}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("combobox"))
    await user.click(
      await screen.findByRole("option", { name: /Lar Esperança/i }),
    )

    expect(onChange).toHaveBeenCalledWith("inst-2")
  })

  it("emite null ao selecionar 'Sem instituição'", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <InstituicaoSelect
        instituicoes={INSTITUICOES}
        value="inst-1"
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("combobox"))
    await user.click(
      await screen.findByRole("option", { name: /Sem instituição/i }),
    )

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
