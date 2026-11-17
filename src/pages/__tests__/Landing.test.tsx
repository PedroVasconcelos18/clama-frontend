import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import Landing from "../Landing"
import { mockApiFetch } from "@/test/sessao"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { lerRascunho, limparRascunho } from "@/lib/rascunho"
import { TEMAS } from "@/lib/temas"

const { triarMock, navigateMock } = vi.hoisted(() => ({ triarMock: vi.fn(), navigateMock: vi.fn() }))
vi.mock("@/lib/api/triagem", () => ({ triar: triarMock }))
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => navigateMock,
}))

const MSG_CURTA = "Escreva ao menos algumas palavras. Pode ser uma frase só, do jeito que vier."

function renderLanding() {
  return render(
    <MemoryRouter>
      <SessaoProvider>
        <Landing />
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe("Landing", () => {
  beforeEach(() => {
    localStorage.clear()
    limparRascunho()
    triarMock.mockReset()
    navigateMock.mockReset()
    window.history.replaceState(null, "", "/")
    Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"]
    globalThis.IntersectionObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(), takeRecords: () => [] }
    }) as unknown as typeof IntersectionObserver
    mockApiFetch({
      outras: (path) => {
        if (path === "/api/instituicoes")
          return [
            { id: 1, nome: "Casa Alfa", logoUrl: null, causa: "Cestas básicas", metaMensalCentavos: 100000, custoUnidadeCentavos: 5000, unidade: "cestas" },
            { id: 2, nome: "Sem Meta", logoUrl: null, causa: null, metaMensalCentavos: null, custoUnidadeCentavos: null, unidade: null },
          ]
        if (path === "/api/metas")
          return { percentual: 50, de: "2026-11-28", ate: "2026-12-27", instituicoes: [{ instituicaoId: 1, arrecadadoCentavos: 25000 }] }
        throw new Error(`sem mock: ${path}`)
      },
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it("rascunho antigo (sem aceite) volta com texto e tema preenchidos", () => {
    sessionStorage.setItem("clama:rascunho", JSON.stringify({ tema: "luto", texto: "Texto antigo", risco: false }))
    renderLanding()
    expect(screen.getByRole("textbox")).toHaveValue("Texto antigo")
    expect(screen.getByRole("button", { name: "Luto" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("checkbox")).not.toBeChecked()
  })

  it("clicar num tema mostra o guia dele", async () => {
    renderLanding()
    const luto = TEMAS.find((t) => t.id === "luto")!
    fireEvent.click(screen.getByRole("button", { name: luto.rotulo }))
    expect(screen.getByText(luto.guia)).toBeInTheDocument()
  })

  it("sem aceitar a política: mostra o erro e não chama a triagem", async () => {
    renderLanding()
    await userEvent.type(screen.getByRole("textbox"), "Minha casa está em pedaços")
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    expect(
      await screen.findByText("Para enviar seu pedido, é preciso concordar com a política de privacidade."),
    ).toBeInTheDocument()
    expect(triarMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("Continuar com menos de 3 caracteres mostra o aviso e não chama a triagem", async () => {
    renderLanding()
    await userEvent.type(screen.getByRole("textbox"), "oi")
    await userEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    expect(await screen.findByText(MSG_CURTA)).toBeInTheDocument()
    expect(triarMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("com texto, tria, salva o rascunho com o risco e vai para /entrega", async () => {
    triarMock.mockResolvedValue(true)
    renderLanding()
    fireEvent.click(screen.getByRole("button", { name: "Família" }))
    await userEvent.type(screen.getByRole("textbox"), "Minha casa está em pedaços")
    await userEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/entrega"))
    expect(triarMock).toHaveBeenCalledWith("Minha casa está em pedaços")
    expect(lerRascunho()).toEqual({ tema: "familia", texto: "Minha casa está em pedaços", risco: true, consentAceito: true })
  })

  it("mostra as instituições com meta real e sem barra para quem não tem meta", async () => {
    renderLanding()
    expect(await screen.findByText("Casa Alfa")).toBeInTheDocument()
    expect(await screen.findAllByRole("progressbar")).toHaveLength(1)
  })

  it("não tem o contador de orações nem prévia do mural", () => {
    renderLanding()
    expect(screen.queryByText(/orações feitas hoje/i)).toBeNull()
    expect(screen.queryByText(/mural/i)).toBeNull()
  })

  it("o CTA do menu rola até o formulário", () => {
    renderLanding()
    fireEvent.click(screen.getByRole("button", { name: /fazer pedido/i }))
    expect(window.location.hash).toBe("#fazer-pedido")
  })
})
