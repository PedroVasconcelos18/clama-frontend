import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import Login from "@/pages/Login"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { mockApiFetch, usuarioFixture } from "@/test/sessao"
import * as apiModule from "@/lib/api"
import { PastoralApiError } from "@/lib/api"

const navigateMock = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()
vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner")
  return {
    ...actual,
    toast: {
      ...actual.toast,
      error: (...args: unknown[]) => toastErrorMock(...args),
      success: (...args: unknown[]) => toastSuccessMock(...args),
    },
  }
})

function renderLogin(initialUrl = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SessaoProvider>
        <Login />
      </SessaoProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(
  email = "fiel@example.com",
  password = "senha123",
) {
  // o botão fica desabilitado até a sessão do boot carregar
  await waitFor(() =>
    expect((screen.getByRole("button", { name: /Entrar/i }) as HTMLButtonElement).disabled).toBe(false),
  )
  fireEvent.change(screen.getByLabelText(/E-mail/i), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText(/Senha/i), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole("button", { name: /Entrar/i }))
}

describe("Login (/login)", () => {
  beforeEach(() => {
    localStorage.clear()
    navigateMock.mockClear()
    toastErrorMock.mockClear()
    toastSuccessMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("happy path: login redireciona para o next default (/conta)", async () => {
    mockApiFetch({ outras: () => usuarioFixture })

    renderLogin("/login")
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/conta", { replace: true })
    })
  })

  it("happy path: login com ?next=X redireciona para X", async () => {
    mockApiFetch({ outras: () => usuarioFixture })

    renderLogin("/login?next=%2F%23pedido")
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/#pedido", { replace: true })
    })
  })

  it("papel ADMIN ou SUPERUSUARIO vai para /admin, ignorando o next", async () => {
    mockApiFetch({ outras: () => ({ ...usuarioFixture, papel: "ADMIN" }) })

    renderLogin("/login?next=%2Fconta")
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/admin", { replace: true })
    })
    expect(navigateMock).not.toHaveBeenCalledWith("/conta", expect.anything())
  })

  it("o botão Entrar fica desabilitado enquanto a sessão carrega", () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(() => new Promise(() => {}))

    renderLogin("/login")

    expect((screen.getByRole("button", { name: /Entrar/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("Esqueci minha senha pede o link em /api/auth/esqueci-senha", async () => {
    const spy = mockApiFetch({ outras: () => ({}) })

    renderLogin("/login")
    fireEvent.click(screen.getByText(/Esqueci minha senha/i))
    fireEvent.change(await screen.findByLabelText("E-mail", { selector: "#forgot-email" }), {
      target: { value: "fiel@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Enviar link/i }))

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "/api/auth/esqueci-senha",
        expect.objectContaining({ body: JSON.stringify({ email: "fiel@example.com" }) }),
      ),
    )
    expect(await screen.findByText(/link para escolher uma nova senha/)).toBeTruthy()
  })

  it("credenciais erradas (401): mostra toast pastoral", async () => {
    mockApiFetch({
      outras: () => {
        throw new PastoralApiError(
          "Erro",
          "invalid_credentials",
          "E-mail ou senha não conferem. Tente novamente.",
          401,
        )
      },
    })

    renderLogin("/login")
    await fillAndSubmit("errado@example.com", "senha-errada")

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "E-mail ou senha não conferem. Tente novamente.",
      )
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("admin tentando logar (401 genérica): mostra mesmo toast", async () => {
    mockApiFetch({
      outras: () => {
        throw new PastoralApiError(
          "Erro",
          "invalid_credentials",
          "E-mail ou senha não conferem. Tente novamente.",
          401,
        )
      },
    })

    renderLogin("/login")
    await fillAndSubmit("admin@clama.me", "admin-senha")

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "E-mail ou senha não conferem. Tente novamente.",
      )
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("rate-limit (429): mostra toast pastoral", async () => {
    mockApiFetch({
      outras: () => {
        throw new PastoralApiError(
          "Erro",
          "rate_limit",
          "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
          429,
        )
      },
    })

    renderLogin("/login")
    await fillAndSubmit()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
      )
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("redireciona para next quando a sessão já existe (P-17)", async () => {
    mockApiFetch({ usuario: usuarioFixture })

    renderLogin("/login")

    // Effect-based redirect to default `/`
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/conta", { replace: true })
    })
  })

  it("rejects open-redirect via ?next (P-8): //evil.com folds to default", async () => {
    mockApiFetch({ outras: () => usuarioFixture })

    renderLogin("/login?next=" + encodeURIComponent("//evil.com"))
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/conta", { replace: true })
    })
  })
})
