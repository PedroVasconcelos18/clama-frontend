import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import RedefinirSenha from "@/pages/RedefinirSenha"
import DefinirSenha from "@/pages/DefinirSenha"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { mockApiFetch } from "@/test/sessao"
import * as apiModule from "@/lib/api"
import { PastoralApiError } from "@/lib/api"

const navigateMock = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return { ...actual, useNavigate: () => navigateMock }
})

const toastSuccessMock = vi.fn()
vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner")
  return { ...actual, toast: { ...actual.toast, success: (...a: unknown[]) => toastSuccessMock(...a), error: vi.fn() } }
})

function renderPage(pagina: "redefinir" | "definir" = "redefinir") {
  return render(
    <MemoryRouter>
      <SessaoProvider>{pagina === "redefinir" ? <RedefinirSenha /> : <DefinirSenha />}</SessaoProvider>
    </MemoryRouter>,
  )
}

function preencher(nova = "uma-senha-bem-longa", confirmar = nova) {
  fireEvent.change(screen.getByLabelText(/^Nova senha$/i), { target: { value: nova } })
  fireEvent.change(screen.getByLabelText(/Confirmar nova senha/i), { target: { value: confirmar } })
}

const botao = () => screen.getByRole("button", { name: /senha$/i }) as HTMLButtonElement

describe("RedefinirSenha / DefinirSenha", () => {
  beforeEach(() => {
    navigateMock.mockClear()
    toastSuccessMock.mockClear()
    window.history.replaceState(null, "", "/redefinir-senha?x=1#token=abc123")
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.head.querySelectorAll('meta[name="referrer"]').forEach((m) => m.remove())
  })

  it("tira o token da URL assim que le, preservando o resto", async () => {
    mockApiFetch({})
    renderPage()
    expect(window.location.search).toBe("?x=1")
    expect(window.location.hash).toBe("")
    expect(window.location.href).not.toContain("abc123")
  })

  it("link antigo com ?token= continua valendo e e limpo da URL", () => {
    window.history.replaceState(null, "", "/redefinir-senha?token=abc123&x=1")
    mockApiFetch({})
    renderPage()
    expect(window.location.search).toBe("?x=1")
  })

  it("poe <meta name=referrer content=no-referrer> enquanto a pagina esta montada", () => {
    mockApiFetch({})
    const { unmount } = renderPage()
    expect(document.head.querySelector('meta[name="referrer"]')?.getAttribute("content")).toBe("no-referrer")
    unmount()
    expect(document.head.querySelector('meta[name="referrer"]')).toBeNull()
  })

  it("envia token e novaSenha, avisa e vai para /login", async () => {
    const spy = mockApiFetch({ outras: () => ({}) })
    renderPage()
    await waitFor(() => expect(botao().disabled).toBe(false))
    preencher()
    fireEvent.click(botao())
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true }))
    expect(toastSuccessMock).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith(
      "/api/auth/redefinicao-de-senha",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "abc123", novaSenha: "uma-senha-bem-longa" }) }),
    )
  })

  it("confirmacao diferente: erro do zod, sem chamar a API", async () => {
    const spy = mockApiFetch({ outras: () => ({}) })
    renderPage()
    await waitFor(() => expect(botao().disabled).toBe(false))
    preencher("uma-senha-bem-longa", "outra-senha-qualquer")
    fireEvent.click(botao())
    expect(await screen.findByText(/não coincidem/)).toBeTruthy()
    expect(spy.mock.calls.filter(([p]) => p !== "/api/auth/eu")).toHaveLength(0)
  })

  it("token invalido mostra a mensagemPastoral do servidor", async () => {
    mockApiFetch({
      outras: () => {
        throw new PastoralApiError("Erro", "token_invalido", "Este link expirou. Peça um novo.", 400)
      },
    })
    renderPage()
    await waitFor(() => expect(botao().disabled).toBe(false))
    preencher()
    fireEvent.click(botao())
    expect(await screen.findByText("Este link expirou. Peça um novo.")).toBeTruthy()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("botao desabilitado enquanto a sessao carrega", async () => {
    const spy = vi.spyOn(apiModule, "apiFetch").mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(botao().disabled).toBe(true)
    expect(spy).toHaveBeenCalled()
  })

  it("/definir-senha: titulo proprio, mesmo endpoint", async () => {
    const spy = mockApiFetch({ outras: () => ({}) })
    renderPage("definir")
    expect(screen.getAllByText("Definir senha").length).toBeGreaterThan(0)
    await waitFor(() => expect(botao().disabled).toBe(false))
    preencher()
    fireEvent.click(botao())
    await waitFor(() => expect(spy).toHaveBeenCalledWith("/api/auth/redefinicao-de-senha", expect.anything()))
  })
})
