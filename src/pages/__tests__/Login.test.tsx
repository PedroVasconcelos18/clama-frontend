import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import Login from "@/pages/Login"
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext"
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
      <CustomerAuthProvider>
        <Login />
      </CustomerAuthProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(
  email = "fiel@example.com",
  password = "senha123",
) {
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

  it("happy path: login com flag false redireciona para next (default '/')", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-1",
      refresh: "refresh-1",
      user: {
        id: "u-1",
        email: "fiel@example.com",
        nome_completo: "Pedro",
        force_change_password: false,
        freemium_used_at: null,
      },
    })

    renderLogin("/login")
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true })
    })
  })

  it("happy path: login com flag false e ?next=X redireciona para X", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-1",
      refresh: "refresh-1",
      user: {
        id: "u-1",
        email: "fiel@example.com",
        nome_completo: "Pedro",
        force_change_password: false,
        freemium_used_at: null,
      },
    })

    renderLogin("/login?next=%2F%23pedido")
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/#pedido", { replace: true })
    })
  })

  it("flag true redireciona para /trocar-senha?next=...", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-1",
      refresh: "refresh-1",
      user: {
        id: "u-1",
        email: "fiel@example.com",
        nome_completo: "Pedro",
        force_change_password: true,
        freemium_used_at: null,
      },
    })

    renderLogin("/login?next=%2F%23pedido")
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        `/trocar-senha?next=${encodeURIComponent("/#pedido")}`,
        { replace: true },
      )
    })
  })

  it("credenciais erradas (401): mostra toast pastoral", async () => {
    vi.spyOn(apiModule, "apiFetch").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "invalid_credentials",
        "E-mail ou senha não conferem. Tente novamente.",
        401,
      ),
    )

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
    vi.spyOn(apiModule, "apiFetch").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "invalid_credentials",
        "E-mail ou senha não conferem. Tente novamente.",
        401,
      ),
    )

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
    vi.spyOn(apiModule, "apiFetch").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "rate_limit",
        "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
        429,
      ),
    )

    renderLogin("/login")
    await fillAndSubmit()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
      )
    })
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("redirects to next when already authenticated and force_change_password=false (P-17)", async () => {
    // Pre-populate storage with valid auth + flag false
    localStorage.setItem(
      "clama:customer-auth",
      JSON.stringify({
        user: {
          id: "u-1",
          email: "fiel@example.com",
          nome_completo: "Pedro",
          force_change_password: false,
          freemium_used_at: null,
        },
        accessToken: "access-1",
        refreshToken: "refresh-1",
      }),
    )

    renderLogin("/login")

    // Effect-based redirect to default `/`
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true })
    })
  })

  it("rejects open-redirect via ?next (P-8): //evil.com folds to '/'", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-1",
      refresh: "refresh-1",
      user: {
        id: "u-1",
        email: "fiel@example.com",
        nome_completo: "Pedro",
        force_change_password: false,
        freemium_used_at: null,
      },
    })

    renderLogin("/login?next=" + encodeURIComponent("//evil.com"))
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true })
    })
  })
})
