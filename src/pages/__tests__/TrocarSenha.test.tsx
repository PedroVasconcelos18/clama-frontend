import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import TrocarSenha from "@/pages/TrocarSenha"
import { SessaoProvider } from "@/contexts/SessaoContext"
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

const fetchMock = vi.fn()

let logado = false
function setLoggedIn() {
  logado = true
}

// `GET /api/auth/eu` (boot da sessão) é respondido aqui; o resto vai para o fetchMock.
function fetchComSessao(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : (input as Request).url
  if (url === "/api/auth/eu") {
    return Promise.resolve(
      logado
        ? new Response(
            JSON.stringify({
              id: 1,
              email: "fiel@example.com",
              nomeCompleto: "Pedro",
              nomeFormatoBlog: "Pedro",
              papel: "CLIENTE",
            }),
            { status: 200 },
          )
        : new Response("{}", { status: 401 }),
    )
  }
  return fetchMock(input, init)
}

function renderPage(url = "/trocar-senha") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SessaoProvider>
        <TrocarSenha />
      </SessaoProvider>
    </MemoryRouter>,
  )
}

async function fillForm(
  senhaAtual = "temp-1234",
  novaSenha = "minha-nova-senha-segura",
  confirmar = "minha-nova-senha-segura",
) {
  fireEvent.change(screen.getByLabelText(/Senha atual/i), {
    target: { value: senhaAtual },
  })
  fireEvent.change(screen.getByLabelText(/^Nova senha$/i), {
    target: { value: novaSenha },
  })
  fireEvent.change(screen.getByLabelText(/Confirmar nova senha/i), {
    target: { value: confirmar },
  })
}

async function submit() {
  fireEvent.click(screen.getByRole("button", { name: /Trocar senha/i }))
}

describe("TrocarSenha (/trocar-senha)", () => {
  beforeEach(() => {
    logado = false
    localStorage.clear()
    navigateMock.mockClear()
    toastErrorMock.mockClear()
    toastSuccessMock.mockClear()
    fetchMock.mockReset()
    globalThis.fetch = fetchComSessao as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("anônimo: redireciona para /login?next=/trocar-senha", async () => {
    renderPage("/trocar-senha")

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent("/trocar-senha")}`,
        { replace: true },
      )
    })
  })

  it("happy path: troca a senha em /api/conta/senha e redireciona para next", async () => {
    setLoggedIn()

    fetchMock.mockImplementation((input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url
      if (url.includes("/api/conta/senha")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              mensagemPastoral: "Senha trocada com sucesso.",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })

    renderPage("/trocar-senha?next=%2Fconta")
    await fillForm()
    await submit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/conta", { replace: true })
    })

    // Toast de sucesso pastoral
    expect(toastSuccessMock).toHaveBeenCalled()
    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).includes("/api/conta/senha"))!
    expect(JSON.parse(init.body)).toEqual({
      senhaAtual: "temp-1234",
      novaSenha: "minha-nova-senha-segura",
    })
  })

  it("senha errada (400): mostra toast pastoral", async () => {
    setLoggedIn()

    fetchMock.mockImplementation((input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url
      if (url.includes("/api/conta/senha")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              codigo: "senha_atual_incorreta",
              mensagemPastoral:
                "A senha atual não confere. Tente novamente, com calma.",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          ),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })

    renderPage("/trocar-senha")
    await fillForm("senha-errada")
    await submit()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "A senha atual não confere. Tente novamente, com calma.",
      )
    })
  })

  it("senha_fraca (400): mostra na tela o motivo vindo da API", async () => {
    setLoggedIn()
    const motivo =
      "Esta senha é muito curta. Ela precisa conter pelo menos 8 caracteres. Esta senha é muito comum."
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            codigo: "senha_fraca",
            mensagemPastoral: motivo,
            erros: [{ campo: "novaSenha", mensagem: "Esta senha é muito comum." }],
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    )

    renderPage("/trocar-senha")
    await fillForm("temp-1234", "12345678", "12345678")
    await submit()

    expect(await screen.findByText(motivo)).toBeInTheDocument()
  })

  it("nova_senha != confirmar_senha: erro inline do Zod, sem chamar API", async () => {
    setLoggedIn()
    const beforeCount = fetchMock.mock.calls.length

    renderPage("/trocar-senha")
    await fillForm("temp-1234", "minha-senha-1", "minha-senha-2")
    await submit()

    await waitFor(() => {
      expect(
        screen.getByText(/As senhas não coincidem/i),
      ).toBeInTheDocument()
    })

    // Não fez request de change-password
    const changePassCalls = fetchMock.mock.calls.filter(
      (c) =>
        typeof c[0] === "string" &&
        (c[0] as string).includes("/api/conta/senha"),
    )
    expect(changePassCalls.length).toBe(beforeCount)
  })

  it("PastoralApiError direto (mock api.ts): exibe toast pastoral", async () => {
    setLoggedIn()

    // Esse teste cobre o caminho onde o backend retorna erro genérico.
    // Em vez de simular fetch, usamos mock no apiFetch interno via fetch mock.
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ detail: "Algo deu errado" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    )

    renderPage("/trocar-senha")
    await fillForm()
    await submit()

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })
    // Não deve ter sido criada PastoralApiError com 200
    expect(toastErrorMock.mock.calls[0]?.[0]).toBeTruthy()
  })

  // sanity: o tipo PastoralApiError continua exportado
  it("PastoralApiError type sanity", () => {
    expect(PastoralApiError).toBeDefined()
  })
})
